import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chooseOwner } from "@/lib/domain/rules";
import type { GivingSource } from "@/lib/domain/types";
import type { ImportedGift } from "./source-adapter";

export interface CommitResult {
  committed: number;
  skipped: number;
  donorsCreated: number;
  error?: string;
}

export async function commitImportBatch(
  gifts: ImportedGift[],
  source: GivingSource,
  fileName: string,
): Promise<CommitResult> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { committed: 0, skipped: 0, donorsCreated: 0, error: "Not authenticated." };

  const { data: self } = await supabase.from("members").select("role").eq("id", user.id).single();
  if (self?.role !== "admin") {
    return { committed: 0, skipped: 0, donorsCreated: 0, error: "Import requires admin role." };
  }

  // Load board members and their current donor counts for round-robin assignment.
  const { data: rawMembers } = await supabase.from("members")
    .select("id, display_name, active, last_assigned_at")
    .eq("active", true)
    .eq("role", "board_member");
  if (!rawMembers?.length) {
    return { committed: 0, skipped: 0, donorsCreated: 0, error: "No active board members for owner assignment." };
  }
  const { data: ownerCounts } = await supabase.from("donors").select("owner_id")
    .in("owner_id", rawMembers.map((m) => m.id));
  const countMap = (ownerCounts ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.owner_id] = (acc[d.owner_id] ?? 0) + 1;
    return acc;
  }, {});
  const boardMembers = rawMembers.map((m) => ({
    id: m.id,
    name: m.display_name,
    active: m.active as boolean,
    assignedCount: countMap[m.id] ?? 0,
    lastAssignedAt: m.last_assigned_at as string | null,
  }));

  // Upsert programs referenced in this batch so the FK is never violated.
  const programIds = [...new Set(gifts.map((g) => g.programId))];
  for (const programId of programIds) {
    await supabase.from("programs")
      .upsert({ id: programId, name: programId }, { onConflict: "id", ignoreDuplicates: true });
  }

  // Record this batch for audit history.
  await supabase.from("import_batch").insert({
    source, file_name: fileName, row_kind: "gift",
    rows_read: gifts.length, created_by: user.id,
  });

  let committed = 0;
  let skipped = 0;
  let donorsCreated = 0;

  for (const gift of gifts) {
    const normalizedEmail = gift.donor.email ? gift.donor.email.trim().toLowerCase() : null;

    let donorId: string | null = null;
    if (normalizedEmail) {
      const { data: existing } = await supabase.from("donors")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      donorId = existing?.id ?? null;
    }

    if (!donorId) {
      const owner = chooseOwner(boardMembers);
      if (!owner) {
        return { committed, skipped, donorsCreated, error: "No eligible board member for owner assignment." };
      }
      const { data: newDonor, error: donorErr } = await supabase.from("donors")
        .insert({ name: gift.donor.name, kind: gift.donor.kind, email: gift.donor.email, owner_id: owner.id })
        .select("id")
        .single();
      if (donorErr) {
        return { committed, skipped, donorsCreated, error: `Failed to create donor: ${donorErr.message}` };
      }
      donorId = newDonor.id;
      donorsCreated++;
      owner.assignedCount++;
      owner.lastAssignedAt = new Date().toISOString();
    }

    // ON CONFLICT DO NOTHING → replay safety from unique(source, source_record_id).
    const { data: inserted } = await supabase.from("gifts")
      .upsert({
        donor_id: donorId,
        amount_cents: gift.amountCents,
        currency: gift.currency,
        received_on: gift.receivedOn,
        program_id: gift.programId,
        source: gift.source,
        source_record_id: gift.sourceRecordId,
      }, { onConflict: "source,source_record_id", ignoreDuplicates: true })
      .select("id");

    if (inserted && inserted.length > 0) committed++;
    else skipped++;
  }

  return { committed, skipped, donorsCreated };
}

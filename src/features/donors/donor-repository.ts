import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LiveDonorRow {
  id: string;
  name: string;
  kind: "individual" | "foundation" | "company";
  email: string | null;
  ownerId: string;
  ownerName: string;
  totalCents: number;
  sources: string[];
}

export async function fetchLiveDonors(search?: string, ownerId?: string): Promise<LiveDonorRow[] | null> {
  try {
    const supabase = await createSupabaseServerClient();

    let donorQuery = supabase.from("donors").select("id, name, kind, email, owner_id").order("name");
    if (ownerId) donorQuery = donorQuery.eq("owner_id", ownerId);
    if (search?.trim()) donorQuery = donorQuery.ilike("name", `%${search.trim()}%`);

    const { data: donors, error } = await donorQuery;
    if (error || !donors) return null;
    if (donors.length === 0) return [];

    const donorIds = donors.map((d) => d.id);
    const ownerIds = [...new Set(donors.map((d) => d.owner_id))];

    const [{ data: members }, { data: gifts }] = await Promise.all([
      supabase.from("members").select("id, display_name").in("id", ownerIds),
      supabase.from("gifts").select("donor_id, amount_cents, source").in("donor_id", donorIds),
    ]);

    const memberMap: Record<string, string> = Object.fromEntries(
      (members ?? []).map((m) => [m.id, m.display_name as string]),
    );
    const giftStats = (gifts ?? []).reduce<Record<string, { totalCents: number; sources: Set<string> }>>(
      (acc, g) => {
        if (!acc[g.donor_id]) acc[g.donor_id] = { totalCents: 0, sources: new Set() };
        acc[g.donor_id].totalCents += g.amount_cents as number;
        acc[g.donor_id].sources.add(g.source as string);
        return acc;
      }, {},
    );

    return donors.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind as LiveDonorRow["kind"],
      email: d.email ?? null,
      ownerId: d.owner_id,
      ownerName: memberMap[d.owner_id] ?? "Unknown",
      totalCents: giftStats[d.id]?.totalCents ?? 0,
      sources: [...(giftStats[d.id]?.sources ?? [])],
    }));
  } catch {
    return null;
  }
}

export interface LiveDonorDetail extends LiveDonorRow {
  gifts: { id: string; amountCents: number; receivedOn: string; programId: string; source: string }[];
  communications: { id: string; channel: string; summary: string; occurredAt: string }[];
}

export async function fetchLiveDonor(id: string): Promise<LiveDonorDetail | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: d, error } = await supabase.from("donors")
      .select("id, name, kind, email, owner_id")
      .eq("id", id)
      .single();
    if (error || !d) return null;

    const [{ data: members }, { data: gifts }, { data: comms }] = await Promise.all([
      supabase.from("members").select("id, display_name").eq("id", d.owner_id).single(),
      supabase.from("gifts").select("id, amount_cents, received_on, program_id, source")
        .eq("donor_id", id).order("received_on", { ascending: false }),
      supabase.from("communications").select("id, channel, summary, occurred_at")
        .eq("donor_id", id).order("occurred_at", { ascending: false }),
    ]);

    const totalCents = (gifts ?? []).reduce((s, g) => s + (g.amount_cents as number), 0);
    return {
      id: d.id, name: d.name,
      kind: d.kind as LiveDonorRow["kind"],
      email: d.email ?? null,
      ownerId: d.owner_id,
      ownerName: (members as { display_name: string } | null)?.display_name ?? "Unknown",
      totalCents,
      sources: [...new Set((gifts ?? []).map((g) => g.source as string))],
      gifts: (gifts ?? []).map((g) => ({
        id: g.id, amountCents: g.amount_cents as number,
        receivedOn: g.received_on as string,
        programId: g.program_id as string,
        source: g.source as string,
      })),
      communications: (comms ?? []).map((c) => ({
        id: c.id, channel: c.channel as string,
        summary: c.summary as string,
        occurredAt: c.occurred_at as string,
      })),
    };
  } catch {
    return null;
  }
}

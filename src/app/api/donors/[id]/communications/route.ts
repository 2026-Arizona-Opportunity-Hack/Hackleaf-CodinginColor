import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";
import { fetchLiveDonor } from "@/features/donors/donor-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isDemoWorkspace()) {
    return NextResponse.json(
      { error: "demo_mode", message: "Set APP_DATA_MODE=live to persist communications." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id: donorId } = await params;

  let body: { channel?: string; summary?: string; occurredAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { channel, summary, occurredAt } = body;
  const CHANNELS = ["email", "sms", "meeting", "phone"];

  if (!channel || !CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel must be one of: email, sms, meeting, phone." }, { status: 400 });
  }
  if (!summary?.trim() || summary.trim().length > 2000) {
    return NextResponse.json({ error: "summary is required and must be under 2000 characters." }, { status: 400 });
  }
  if (!occurredAt) {
    return NextResponse.json({ error: "occurredAt (ISO date) is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (!await fetchLiveDonor(donorId)) return NextResponse.json({error:"Donor not found."},{status:404,headers:{"Cache-Control":"no-store"}});

  const { data, error } = await supabase.from("communications").insert({
    donor_id: donorId,
    actor_id: user.id,
    channel,
    summary: summary.trim(),
    occurred_at: occurredAt,
    origin: "manual_log",
  }).select("id, channel, summary, occurred_at").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(data, { status: 201, headers: { "Cache-Control": "no-store" } });
}

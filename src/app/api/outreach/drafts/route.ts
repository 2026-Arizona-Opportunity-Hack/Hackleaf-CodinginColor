import { NextResponse } from "next/server";

// Stub — returns 503 until Kaustubh's authenticated draft persistence and delivery provider are ready.
// When implemented: validate body, store draft with state="draft", never equate saved with sent.
export async function POST() {
  return NextResponse.json(
    { error: "outreach_not_connected", message: "Draft persistence not yet implemented." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";

// Stub — returns 503 until Kaustubh's authenticated communication persistence is ready.
export async function POST() {
  return NextResponse.json(
    { error: "communications_not_connected", message: "Communication persistence not yet implemented." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

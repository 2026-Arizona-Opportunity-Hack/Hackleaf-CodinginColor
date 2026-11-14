import { NextResponse } from "next/server";

// Returns 503 until Kaustubh's authenticated transactional import primitive is ready.
// When the primitive ships, this route will accept multipart/form-data with `file` and
// `source`, validate server-side, persist via the import primitive, and return the commit result.
export async function POST() {
  return NextResponse.json(
    { error: "import_not_connected", message: "Transactional import primitive not yet implemented." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

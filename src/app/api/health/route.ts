export function GET() {
  return Response.json({ status: "ok", application: "hackleaf", schemaVersion: "1" }, { headers: { "Cache-Control": "no-store" } });
}

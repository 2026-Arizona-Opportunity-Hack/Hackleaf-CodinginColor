import { validReportingKey } from "@/lib/domain/api-key";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!validReportingKey(request.headers.get("authorization"), process.env.CIC_REPORTING_API_KEY)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }
  // Explicitly unavailable until aggregate queries and period validation ship.
  // Never return synthetic demo totals as CIC's live organizational health.
  return Response.json({ error: "reporting_not_connected", schemaVersion: "1" }, { status: 503, headers });
}

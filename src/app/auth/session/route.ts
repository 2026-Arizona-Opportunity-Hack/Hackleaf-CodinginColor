import { getDemoUser } from "@/features/demo-auth/session";
import { NextResponse } from "next/server";
import { getSessionView } from "@/features/live-workspace/session";
import { isDemoWorkspace } from "@/lib/workspace";

export async function GET() {
  const user=isDemoWorkspace()?await getDemoUser():null;
  const view = isDemoWorkspace() ? {status:user?"authorized":"signed_out",accountId:user?.id??null,name:user?.name??"Guest",role:user?.role??null} : await getSessionView();
  return NextResponse.json(view, { status: view?.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

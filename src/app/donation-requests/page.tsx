import { demoAIEnabled } from "@/features/assistant/config";
import type { Metadata } from "next";
import { RequestWorkspace } from "@/features/donation-requests/request-workspace";
import Link from "next/link";
import { getRequestAccess } from "@/features/donation-requests/live-access";
import { loadRequestFunding } from "@/features/donation-requests/live-repository";
import { LiveRequestWorkspace } from "@/features/donation-requests/live-workspace";
import { isDemoWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Donation requests" };
export default async function DonationRequestsPage() {
  if (isDemoWorkspace()) return <RequestWorkspace aiEnabled={demoAIEnabled()} />;
  const access = await getRequestAccess();
  if (access.status !== "signed_in") return <section><h1>{access.status === "unavailable" ? "Session verification unavailable." : "Sign in to manage donation requests."}</h1><p>{access.status === "unavailable" ? "Please refresh to try again." : "Donation requests are available to signed-in accounts. Staff approval is not required."}</p><Link href="/auth/sign-in">Sign in</Link></section>;
  let data, failure: unknown;
  try { data = await loadRequestFunding(); }
  catch (error) { failure = error; }
  if (!data) return <section><h1>Request funding is unavailable.</h1><p>{failure instanceof Error && failure.message === "migration_required" ? "The project owner must apply the request-funding migrations (003 and 004) to enable live requests and allocations." : "Live funding could not be loaded. Please check your connection and access, then refresh."}</p><p>No demo requests are used as a fallback.</p></section>;
  return <LiveRequestWorkspace data={data} />;
}

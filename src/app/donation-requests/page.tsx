import type { Metadata } from "next";
import { RequestWorkspace } from "@/features/donation-requests/request-workspace";
import { isDemoWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Donation requests" };
export default function DonationRequestsPage() {
  if (!isDemoWorkspace()) return null;
  return <RequestWorkspace />;
}

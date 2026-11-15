import { DonorProfile } from "@/features/donors/donor-profile";
import { LiveDonorProfile } from "@/features/donors/live-donor-profile";
import { isDemoWorkspace } from "@/lib/workspace";
export default async function DonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return isDemoWorkspace() ? <DonorProfile id={id} /> : <LiveDonorProfile id={id} />;
}

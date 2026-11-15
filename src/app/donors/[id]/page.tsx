import { DonorProfile } from "@/features/donors/donor-profile";
import { LiveDonorProfile } from "@/features/donors/live-donor-profile";
import { isDemoWorkspace } from "@/lib/workspace";
import { requireDemoUser } from "@/features/demo-auth/session";
import { demoOwnerScope } from "@/features/donors/demo-access";
import { demoDonors } from "@/lib/demo/data";
import { notFound } from "next/navigation";
export default async function DonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if(isDemoWorkspace()) {
    const user=await requireDemoUser(),donor=demoDonors.find(d=>d.id===id),owner=demoOwnerScope(user);
    if(donor&&owner!==null&&donor.ownerId!==owner)notFound();
    return <DonorProfile id={id}/>;
  }
  return <LiveDonorProfile id={id} />;
}

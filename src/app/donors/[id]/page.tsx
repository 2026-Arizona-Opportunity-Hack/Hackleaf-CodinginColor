import { DonorProfile } from "@/features/donors/donor-profile";
import { isDemoWorkspace } from "@/lib/workspace";
export default async function DonorPage({ params }: { params: Promise<{ id: string }> }) { if (!isDemoWorkspace()) return null; return <DonorProfile id={(await params).id} />; }

import { DonorWelcome } from "@/features/donor-portal/portal-frame";
import { isDemoWorkspace } from "@/lib/workspace";
export default function Page() {
  if (!isDemoWorkspace()) return null;
  return <DonorWelcome />;
}

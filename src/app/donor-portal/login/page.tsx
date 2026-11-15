import { LoginDonor } from "@/features/donor-portal/entry-pages";
import { isDemoWorkspace } from "@/lib/workspace";
export default function Page() {
  if (!isDemoWorkspace()) return null;
  return <LoginDonor />;
}

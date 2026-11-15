import { DonatePage } from "@/features/donor-portal/donate-page";
import { isDemoWorkspace } from "@/lib/workspace";
export default function Page() {
  if (!isDemoWorkspace()) return null;
  return <DonatePage />;
}

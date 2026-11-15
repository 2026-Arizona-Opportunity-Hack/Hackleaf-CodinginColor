import { OverviewWorkspace } from "@/components/overview-workspace";
import { isDemoWorkspace } from "@/lib/workspace";

export default function OverviewPage() {
  if (!isDemoWorkspace()) return null;
  return <OverviewWorkspace />;
}

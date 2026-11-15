import { redirect } from "next/navigation";
import { OverviewWorkspace } from "@/components/overview-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default function OverviewPage() {
  if (!isDemoWorkspace()) redirect("/dashboard");
  return <OverviewWorkspace />;
}

import { ClientDashboard } from "@/features/case-management/dashboard";
import { isDemoWorkspace } from "@/lib/workspace";
import { StaffDashboard } from "@/features/live-workspace/dashboard";
export default function DashboardPage() {
  if (isDemoWorkspace()) return <ClientDashboard />;
  return <StaffDashboard />;
}

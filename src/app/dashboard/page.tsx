import { ClientDashboard } from "@/features/case-management/dashboard";
import { isDemoWorkspace } from "@/lib/workspace";
import { StaffDashboard } from "@/features/live-workspace/dashboard";
import { getLiveStaff } from "@/lib/supabase/member";
export default async function DashboardPage() {
  if (isDemoWorkspace() || (await getLiveStaff()).status === "authorized") return <ClientDashboard />;
  return <StaffDashboard />;
}

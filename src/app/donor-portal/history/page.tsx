import { HistoryPage } from "@/features/donor-portal/history-page";
import { isDemoWorkspace } from "@/lib/workspace";
export default function Page() {
  if (!isDemoWorkspace()) return null;
  return <HistoryPage />;
}

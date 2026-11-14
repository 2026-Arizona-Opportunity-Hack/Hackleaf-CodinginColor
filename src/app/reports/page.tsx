import { ReportWorkspace } from "@/features/reports/report-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default function ReportsPage() { if (!isDemoWorkspace()) return null; return <ReportWorkspace />; }

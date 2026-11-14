import { RetentionWorkspace } from "@/features/retention/retention-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default function RetentionPage() { if (!isDemoWorkspace()) return null; return <RetentionWorkspace />; }

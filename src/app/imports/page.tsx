import { ImportWorkspace } from "@/features/imports/import-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default function ImportsPage() { if (!isDemoWorkspace()) return null; return <ImportWorkspace />; }

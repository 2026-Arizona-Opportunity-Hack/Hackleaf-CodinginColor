import { requireDemoUser } from "@/features/demo-auth/session";
import { ImportWorkspace } from "@/features/imports/import-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default async function ImportsPage() { if (!isDemoWorkspace()) return null; const user=await requireDemoUser();if(user.role!=="admin")return <section><h1>Admin access required.</h1><p>Only Admin can import donor records.</p></section>;return <ImportWorkspace />; }

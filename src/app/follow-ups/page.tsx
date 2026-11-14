import { FollowUpWorkspace } from "@/features/follow-ups/follow-up-workspace";
import { isDemoWorkspace } from "@/lib/workspace";
export default function FollowUpsPage() { if (!isDemoWorkspace()) return null; return <FollowUpWorkspace />; }

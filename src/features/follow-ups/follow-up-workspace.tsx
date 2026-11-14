import { FoundationNotice, PageHeading } from "@/components/page-heading";
import { TaskList } from "@/components/task-list";
import { demoFollowUps } from "@/lib/demo/data";

export function FollowUpWorkspace() {
  return <><PageHeading title="Make the next step happen." description="A clear action, an owner, and a date for every relationship." />
    <TaskList tasks={demoFollowUps} />
    <FoundationNotice>Aditya owns task creation/completion, quarterly coverage, thank-you drafts and human-reviewed sending. This foundation shows fictional next steps; no reminders or messages are sent.</FoundationNotice>
    <h2>From conversation to follow-through</h2><p className="simple-list">The P1 debrief flow will accept a note, suggest a dated next step, and draft outreach for review. Suggested dates and outcomes must be confirmed before saving.</p>
  </>;
}

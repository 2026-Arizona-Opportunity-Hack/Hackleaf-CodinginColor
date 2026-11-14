import { PageHeading } from "@/components/page-heading";
import { TaskList } from "@/components/task-list";
import { demoFollowUps } from "@/lib/demo/data";
import { OutreachDraftForm } from "./outreach-draft-form";

export function FollowUpWorkspace() {
  return (
    <>
      <PageHeading
        title="Make the next step happen."
        description="A clear action, an owner, and a date for every relationship."
      />
      <section>
        <h2>Open next steps</h2>
        <TaskList tasks={demoFollowUps} />
        <p><small>Fictional tasks · task creation, completion and quarterly reminders require the authenticated task API.</small></p>
      </section>
      <OutreachDraftForm />
    </>
  );
}

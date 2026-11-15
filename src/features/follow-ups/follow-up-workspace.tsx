"use client";

import { useEffect, useRef, useState, type FormEvent, type SetStateAction } from "react";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { demoDate, demoDonors, demoFollowUps, demoMembers } from "@/lib/demo/data";
import type { FollowUp } from "@/lib/domain/types";
import { makeTask, orderedTasks, taskGroup } from "./tasks";
import styles from "./workspace.module.css";
import { OutreachWorkspace } from "./outreach-workspace";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";

export function FollowUpWorkspace() {
  const workspace = useAssistantWorkspace();
  const [localTasks, setLocalTasks] = useState(demoFollowUps);
  const tasks = workspace?.relationships.tasks ?? localTasks;
  const donors = workspace?.relationships.donors ?? demoDonors;
  function setTasks(value: SetStateAction<FollowUp[]>) {
    if (workspace) workspace.setRelationships((current) => ({ ...current, tasks: typeof value === "function" ? value(current.tasks) : value }));
    else setLocalTasks(value);
  }
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) titleInput.current?.focus(); }, [editing]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const task = makeTask(Object.fromEntries(fields), donors, demoMembers, editing?.id ?? crypto.randomUUID());
      setTasks((current) => editing ? current.map((item) => item.id === editing.id ? { ...task, status: item.status } : item) : [...current, task]);
      setEditing(null);
      form.reset();
      setError("");
      setMessage("Demo next step saved for this page session.");
    } catch {
      setError("Choose a donor, a valid date, and a next step of 1–500 characters with an active owner.");
    }
  }

  return <><PageHeading title="Make the next step happen." description="A clear action, an owner, and a date for every relationship." />
    <div className={styles.stack}>
      <p className={styles.notice}>Fictional demo · Changes reset when you reload or leave this page. No reminders or messages are sent. Dates use the demo’s Phoenix operational day: {demoDate}.</p>
      <form className={styles.form} key={editing?.id ?? "new"} onSubmit={save}>
        <h2>{editing ? "Edit next step" : "Create next step"}</h2>
        <label>Donor and assigned owner<select name="donorId" defaultValue={editing?.donorId ?? demoDonors[0].id}>
          {donors.map((donor) => <option key={donor.id} value={donor.id}>{donor.name} · {demoMembers.find((member) => member.id === donor.ownerId)?.name}</option>)}
        </select></label>
        <label>Next step<input ref={titleInput} name="title" required maxLength={500} defaultValue={editing?.title} /></label>
        <label>Due date (Phoenix)<input name="dueOn" type="date" required defaultValue={editing?.dueOn ?? demoDate} /></label>
        <label>Purpose<select name="kind" defaultValue={editing?.kind ?? "check_in"}>
          <option value="check_in">Check in</option><option value="thank_you">Thank you</option><option value="quarterly">Quarterly update</option><option value="renewal">Renewal</option>
        </select></label>
        <div className={styles.row}><button type="submit">{editing ? "Save changes" : "Create demo next step"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setError(""); }}>Cancel edit</button>}</div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>
      <p role="status">{message}</p>
      {(["Overdue", "Today", "Upcoming", "Completed"] as const).map((group) => {
        const items = orderedTasks(tasks.filter((task) => taskGroup(task, demoDate) === group));
        return <section key={group} aria-label={`${group} next steps`}><h2>{group} ({items.length})</h2>
          {!items.length && <p className={styles.meta}>No {group.toLowerCase()} next steps.</p>}
          <ul>{items.map((task) => <li className={styles.card} key={task.id}>
            <h3>{task.title}</h3><p><Link href={`/donors/${task.donorId}`}>{donors.find((donor) => donor.id === task.donorId)?.name}</Link> · {demoMembers.find((member) => member.id === task.ownerId)?.name}</p>
            <p className={styles.meta}><time dateTime={task.dueOn}>{task.dueOn}</time> · {task.kind.replaceAll("_", " ")} · {task.status}</p>
            <div className={styles.row}><button aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task); setError(""); setMessage(`Editing ${task.title}. The form is above the task list.`); }}>Edit</button>
              <button aria-label={`${task.status === "open" ? "Complete" : "Reopen"} ${task.title}`} onClick={() => { setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: item.status === "open" ? "completed" : "open" } : item)); setMessage(task.status === "open" ? "Demo next step completed. This does not count as outreach." : "Demo next step reopened."); }}>{task.status === "open" ? "Complete" : "Reopen"}</button></div>
          </li>)}</ul>
        </section>;
      })}
      <OutreachWorkspace />
    </div>
  </>;
}

"use client";

import Link from "next/link";
import { demoDate, demoDonors } from "@/lib/demo/data";
import type { FollowUp } from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/rules";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";

export function TaskList({ tasks }: { tasks: FollowUp[] }) {
  const workspace = useAssistantWorkspace();
  return <ul className="task-list">{tasks.map((task) => {
    const donor = (workspace?.relationships.donors ?? demoDonors).find((d) => d.id === task.donorId);
    if (!donor) return null;
    return <li key={task.id}><span className="initials" aria-hidden="true">{donor.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}</span>
      <div><Link href={`/donors/${donor.id}`} className="donor-name">{donor.name}</Link><p>{task.title}</p></div>
      <time dateTime={task.dueOn}>{task.dueOn === demoDate ? "Today" : formatDate(task.dueOn)}</time></li>;
  })}</ul>;
}

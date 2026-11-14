import type { ReactNode } from "react";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function FoundationNotice({ children }: { children: ReactNode }) {
  return <aside className="foundation-notice"><strong>Foundation handoff</strong><p>{children}</p></aside>;
}

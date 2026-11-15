"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptionalGivingWorkspace } from "@/features/donation-requests/giving-workspace";

import type { SessionView } from "@/features/live-workspace/session-view";

const links = [
  ["/", "Overview"], ["/donors", "Donors"], ["/imports", "Imports"],
  ["/follow-ups", "Follow-ups"], ["/retention", "Retention"], ["/reports", "Funder packets"],
  ["/donation-requests", "Donation requests"],
] as const;

export function Navigation({ session }: { session?: SessionView | null }) {
  const pathname = usePathname();
  useOptionalGivingWorkspace();
  const adminLinks: string[][] = session?.role === "admin" ? [["/client-integrations","Integrations"],["/client-data","Client CSV"],["/client-settings","Client settings"],["/audit","Audit log"],["/admin/members","Staff members"]] : [];
  const demoLinks = [["/dashboard","Dashboard"],["/clients","Clients"],["/appointments","Appointments"],["/client-reports","Service reports"],["/client-funder-reports","Funder templates"],["/client-intake","Photo intake"],...adminLinks,...links];
  const signedOutLinks = session?.status === "unavailable" ? [["/dashboard", "Dashboard"]] : [["/auth/sign-in", "Staff sign-in"], ["/auth/register", "Register as staff"]];
  const visibleLinks = session?.accountId ? demoLinks : signedOutLinks;
  return <nav aria-label="Main navigation">{visibleLinks.map(([href, label]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</nav>;
}

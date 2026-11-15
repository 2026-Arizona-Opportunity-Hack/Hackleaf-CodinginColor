"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionView } from "@/features/live-workspace/session-view";

const demoOnlyLinks = [
  ["/", "Overview"], ["/clients", "Clients"], ["/appointments", "Appointments"],
  ["/client-reports", "Service reports"], ["/client-funder-reports", "Funder templates"],
  ["/client-intake", "Photo intake"],
] as const;

const demoAdminLinks = [
  ["/client-integrations", "Integrations"], ["/client-data", "Client CSV"],
  ["/client-settings", "Client settings"], ["/audit", "Audit log"],
] as const;

const liveLinks = [
  ["/dashboard", "Dashboard"], ["/donors", "Donors"],
  ["/donation-requests", "Donation requests"], ["/imports", "Imports"],
  ["/follow-ups", "Follow-ups"], ["/retention", "Retention"],
  ["/reports", "Funder packets"],
] as const;

const liveAdminLinks = [["/admin/members", "Staff members"]] as const;

export function Navigation({ session }: { session?: SessionView | null }) {
  const pathname = usePathname();
  const isAdmin = session?.role === "admin";
  const isDemo = !!session?.demo;

  let visibleLinks: readonly (readonly [string, string])[];
  if (!session?.accountId) {
    visibleLinks = session?.status === "unavailable"
      ? [["/dashboard", "Dashboard"]]
      : [["/auth/sign-in", "Staff sign-in"], ["/auth/register", "Register as staff"]];
  } else if (isDemo) {
    visibleLinks = [...demoOnlyLinks, ...(isAdmin ? demoAdminLinks : [])];
  } else {
    visibleLinks = [...liveLinks, ...(isAdmin ? liveAdminLinks : [])];
  }

  return <nav aria-label="Main navigation">{visibleLinks.map(([href, label]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</nav>;
}

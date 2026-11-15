"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptionalDemoWorkspace } from "@/features/donor-portal/demo-workspace";

const links = [
  ["/", "Overview"], ["/donors", "Donors"], ["/imports", "Imports"],
  ["/follow-ups", "Follow-ups"], ["/retention", "Retention"], ["/reports", "Funder packets"],
  ["/donation-requests", "Donation requests"], ["/donor-portal", "Donor portal"],
] as const;

export function Navigation() {
  const pathname = usePathname();
  const demo = useOptionalDemoWorkspace();
  const donorLinks = demo?.currentId ? [["/donor-portal/donate", "Donate"], ["/donor-portal/history", "Donation history"], ["/donor-portal/profile", "My profile"]] : [["/donor-portal/register", "Register as donor"], ["/donor-portal/login", "Login as donor"]];
  const visibleLinks = pathname.startsWith("/donor-portal") ? [...donorLinks, ["/donation-requests", "NGO demo"]] : links;
  return <nav aria-label="Main navigation">{visibleLinks.map(([href, label]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</nav>;
}

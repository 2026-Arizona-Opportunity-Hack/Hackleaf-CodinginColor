"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Overview"], ["/donors", "Donors"], ["/imports", "Imports"],
  ["/follow-ups", "Follow-ups"], ["/retention", "Retention"], ["/reports", "Funder packets"],
] as const;

export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation">{links.map(([href, label]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</nav>;
}

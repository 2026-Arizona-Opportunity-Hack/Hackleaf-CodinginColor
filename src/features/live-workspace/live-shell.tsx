"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function LiveWorkspace({ children, configured, signedIn = false }: { children: ReactNode; configured: boolean; signedIn?: boolean }) {
  const pathname = usePathname();
  const casePages=["/clients","/appointments","/client-reports","/client-funder-reports","/client-intake","/client-settings","/client-data","/client-integrations","/audit"];
  if(configured&&casePages.some(path=>pathname===path||pathname.startsWith(path+"/")))return <>{children}</>;
  if (configured && (pathname === "/" || pathname === "/dashboard" || pathname === "/admin/members" || pathname === "/login" || pathname === "/auth/sign-in" || pathname === "/auth/register" || pathname === "/donation-requests" || pathname === "/donors" || pathname.startsWith("/donors/"))) return <>{children}</>;
  return <section className="setup-state"><h1>{configured ? "Complete this live integration." : "Connect your live workspace."}</h1>
    <p>{configured ? "This feature is not yet connected to authenticated database operations." : "Supabase project URL and publishable key are required in the local environment."}</p>
    {configured && <p><Link href={signedIn ? "/dashboard" : "/auth/sign-in"}>{signedIn ? "Return to dashboard" : "Sign in as staff"}</Link> · <Link href="/donors">Open live donors</Link></p>}
  </section>;
}

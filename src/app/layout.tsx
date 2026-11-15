import { InstallApp } from "@/features/client-p2/install-app";
import { currentTenant } from "@/features/client-p2/tenant-server";
import { organizations } from "@/features/client-p2/tenants";
import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { isDemoWorkspace } from "@/lib/workspace";
import { GivingWorkspaceProvider } from "@/features/donation-requests/giving-workspace";
import { getDemoUser } from "@/features/demo-auth/session";
import type { SessionView } from "@/features/live-workspace/session-view";
import { getSessionView } from "@/features/live-workspace/session";
import { SessionSync, SignOutButton } from "@/features/live-workspace/session-controls";
import { LiveWorkspace } from "@/features/live-workspace/live-shell";
import { AssistantWorkspaceProvider } from "@/features/assistant/workspace-context";
import { ChatWidget } from "@/features/assistant/chat-widget";
import "./globals.css";

// Mode is checked per request, including when environment changes after a build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Hackleaf · Coding in Color", template: "%s · Hackleaf" },
  description: "A relationship workspace for Coding in Color’s donors and funders.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = isDemoWorkspace();
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const organizationId=demo?await currentTenant():null;
  const organization=organizations.find(o=>o.id===organizationId);
  const demoUser=demo?await getDemoUser():null;
  const session:SessionView|null = demo ? {status:demoUser?"authorized":"signed_out",accountId:demoUser?.id??null,name:demoUser?.name??"Guest",role:demoUser?.role??null} : configured ? await getSessionView() : null;
  const signedIn = !!session?.accountId;
  const shell = <div className="app-shell"><aside className="sidebar"><Link href={demo ? "/" : "/dashboard"} className="wordmark">Hackleaf<span>{demo?organization?.name:"Coding in Color"}</span></Link>
      <Navigation session={session} /><p className="sidebar-note">Built for relationships.</p></aside>
      <main id="main" tabIndex={-1}>{demo&&<div className="workspace-bar"><Link href="/organizations">Switch organization</Link><InstallApp/></div>}<div className="workspace-bar"><span>{demo ? `${organization?.name} · Fictional records only` : signedIn ? `Signed in · ${session?.name}` : session?.status === "unavailable" ? "Session verification unavailable" : "Live workspace"}</span>
        {signedIn ? <div style={{display:"flex",alignItems:"center",gap:12}}>{demo && <span>{demoUser?.name} · {demoUser?.role==="admin"?"Admin":"Staff"}</span>}<SignOutButton /></div> : null}</div>
        {demo ? children : <LiveWorkspace configured={configured} signedIn={signedIn}>{children}</LiveWorkspace>}
      </main></div>;
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{session && <SessionSync session={session} />}{demo ? <AssistantWorkspaceProvider><GivingWorkspaceProvider>{shell}{demoUser && <ChatWidget demo />}</GivingWorkspaceProvider></AssistantWorkspaceProvider> : <>{shell}<ChatWidget demo={false} /></>}</body></html>;
}

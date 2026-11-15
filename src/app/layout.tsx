import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { isDemoWorkspace } from "@/lib/workspace";
import { DemoWorkspaceProvider } from "@/features/donor-portal/demo-workspace";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = isDemoWorkspace();
  const shell = <div className="app-shell"><aside className="sidebar"><Link href="/" className="wordmark">Hackleaf<span>Coding in Color</span></Link>
      <Navigation /><p className="sidebar-note">Built for relationships.</p></aside>
      <main id="main" tabIndex={-1}><div className="workspace-bar"><span>{demo ? "Demo workspace · Fictional records only" : "Live workspace · Coding in Color"}</span>
        {demo ? <time dateTime="2026-11-14">November 14, 2026</time> : null}</div>
        {children}
      </main></div>;
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{demo ? <AssistantWorkspaceProvider><DemoWorkspaceProvider>{shell}<ChatWidget demo /></DemoWorkspaceProvider></AssistantWorkspaceProvider> : <>{shell}<ChatWidget demo={false} /></>}</body></html>;
}

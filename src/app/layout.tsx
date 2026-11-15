import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { isDemoWorkspace } from "@/lib/workspace";
import { DemoWorkspaceProvider } from "@/features/donor-portal/demo-workspace";
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
      <main id="main" tabIndex={-1}><div className="workspace-bar"><span>{demo ? "Demo workspace · Fictional records only" : "Live workspace · Setup required"}</span>
        {demo ? <time dateTime="2026-11-14">November 14, 2026</time> : null}</div>
        {demo ? children : <section className="setup-state"><h1>Connect your live workspace.</h1><p>Live sign-in and data access are not connected in this foundation. No donor records are loaded.</p><p>Follow the deployment guide to complete authentication and validate access policies before enabling live use.</p></section>}
      </main></div>;
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{demo ? <DemoWorkspaceProvider>{shell}</DemoWorkspaceProvider> : shell}</body></html>;
}

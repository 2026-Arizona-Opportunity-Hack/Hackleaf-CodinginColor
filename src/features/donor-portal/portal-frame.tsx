"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useDemoWorkspace } from "./demo-workspace";
import { profileName } from "./model";
import styles from "./portal.module.css";

export function PortalFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const demo = useDemoWorkspace();
  const profile = demo.profiles.find((item) => item.id === demo.currentId);
  const router = useRouter();
  return <section className={styles.portal}><header className={styles.heading}><div><p className={styles.eyebrow}>CODING IN COLOR · DONOR PORTAL</p><h1>{title}</h1><p>{description}</p></div>
    {profile && <div className={styles.identity}><span>{profileName(profile)}</span><button className={styles.secondary} onClick={() => { demo.setCurrentId(null); router.push("/donor-portal/login"); }}>Log out of demo</button></div>}
  </header><p className={styles.notice}>Fictional donor demo · Use fictional information. No real account, password verification or payment. Data resets on reload.</p>{children}</section>;
}

export function DonorGate({ children }: { children: ReactNode }) {
  const demo = useDemoWorkspace();
  if (!demo.profiles.some((item) => item.id === demo.currentId)) return <div className={styles.empty}><h2>Enter your donor demo first.</h2><p>Register a fictional profile or choose the sample donor to explore donations and history.</p><Link className={styles.primary} href="/donor-portal/login">Login as donor</Link><Link href="/donor-portal/register">Register as donor</Link></div>;
  return <>{children}</>;
}

export function DonorWelcome() {
  return <PortalFrame title="A little support. A new possibility." description="Support the resources behind Coding in Color’s programs.">
    <div className={styles.welcome}><section><h2>Make your support count.</h2><p>Create a donor profile, explore the funding queue and keep your giving history in one place.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/donor-portal/register">Register as donor</Link><Link className={styles.secondary} href="/donor-portal/login">Login as donor</Link></div>
    </section><aside><h3>How giving works</h3><ol><li>Choose an amount and giving frequency.</li><li>Review how your contribution follows the NGO’s priority order.</li><li>See your simulated contribution and allocation in your history.</li></ol><p>Live giving will use the approved donation provider when connected.</p></aside></div>
  </PortalFrame>;
}

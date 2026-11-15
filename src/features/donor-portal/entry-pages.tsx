"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemoWorkspace } from "./demo-workspace";
import { DonorGate, PortalFrame } from "./portal-frame";
import { ProfileForm } from "./profile-form";
import styles from "./portal.module.css";

export function RegisterDonor() {
  const demo = useDemoWorkspace(), router = useRouter();
  return <PortalFrame title="Register as a donor" description="Tell us who you are and how you prefer to stay in touch.">
    <div className={styles.entryGrid}><aside className={styles.intro}><h2>Your support starts here.</h2><p>Use a fictional individual or organization to explore a donor’s journey.</p><p>Fields marked * are required. Address and phone are optional.</p><p>Already registered in this tab? <Link href="/donor-portal/login">Login as donor</Link></p></aside>
      <ProfileForm onSave={(profile) => { demo.setProfiles([...demo.profiles, profile]); demo.setRegisteredEmail(profile.email); router.push("/donor-portal/login"); }} />
    </div>
  </PortalFrame>;
}

export function LoginDonor() {
  const demo = useDemoWorkspace(), router = useRouter();
  const [email, setEmail] = useState(demo.registeredEmail || "donor1@example.org");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profile = demo.profiles.find((item) => item.email === email.trim().toLowerCase());
    if (!profile) { setError("No matching demo profile in this tab. Register first or use donor1@example.org."); return; }
    demo.setCurrentId(profile.id); router.push("/donor-portal/donate");
  }
  return <PortalFrame title="Login as a donor" description="Explore your giving and donation history in one place.">
    <div className={styles.entryGrid}><aside className={styles.intro}><h2>Welcome back.</h2><p>This is a demo entry screen, not password authentication. Enter the email of a fictional profile registered in this tab.</p><p>You can also try the sample profile: <strong>donor1@example.org</strong>.</p><Link href="/donor-portal/register">Register as a donor</Link></aside>
      <form className={styles.form} onSubmit={submit}><h2>Enter the donor demo</h2>{demo.registeredEmail && <p role="status">Demo profile registered. Continue with your email below.</p>}
        <label>Demo email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></label>
        <p className={styles.muted}>No password is requested or verified. Real sign-in will use the shared authentication service when connected.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.primary}>Enter donor demo</button>
      </form>
    </div>
  </PortalFrame>;
}

export function DonorProfile() {
  const demo = useDemoWorkspace();
  const profile = demo.profiles.find((item) => item.id === demo.currentId);
  const [message, setMessage] = useState("");
  return <PortalFrame title="My donor profile" description="Manage the information and preferences attached to your demo profile."><DonorGate>
    {profile && <ProfileForm key={profile.id} profile={profile} onSave={(next) => { demo.setProfiles(demo.profiles.map((item) => item.id === next.id ? next : item)); setMessage("Demo profile updated for this tab. Existing donation anonymity choices are preserved."); }} />}
    <p role="status">{message}</p>
  </DonorGate></PortalFrame>;
}

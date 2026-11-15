"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInStaff } from "./actions";
import styles from "@/features/demo-auth/auth.module.css";

export function StaffSignInForm() {
  const [state, action, pending] = useActionState(signInStaff, { error: "" });
  return <form action={action} className={styles.form} style={{ maxWidth: 540 }}>
    <label>Staff email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    <button className={styles.primary} disabled={pending}>{pending ? "Signing in…" : "Sign in to live workspace"}</button>
    <p>Need a login? <Link href="/auth/register">Register as staff</Link></p>
    <p className={styles.muted}>Use an existing Supabase account provisioned as an active admin or board member. This form does not create or promote memberships.</p>
  </form>;
}

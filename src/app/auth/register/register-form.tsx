"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerStaff } from "./actions";
import styles from "@/features/demo-auth/auth.module.css";

export function StaffRegistrationForm() {
  const [state, action, pending] = useActionState(registerStaff, { error: "", message: "" });
  if (state.message) return <section className={styles.form} style={{ maxWidth: 580 }}><h2>Next steps for staff access</h2><p role="status">{state.message}</p><p>Your project administrator must approve your membership before you can read donor records.</p><Link className={styles.primary} href="/auth/sign-in">Continue to staff sign-in</Link></section>;
  return <form action={action} className={styles.form} style={{ maxWidth: 580 }}>
    <label>Full name<input name="displayName" required maxLength={200} autoComplete="name" /></label>
    <label>Staff email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
    <label>Password<input name="password" type="password" required minLength={8} maxLength={1024} autoComplete="new-password" aria-describedby="password-help" /></label>
    <p id="password-help" className={styles.muted}>Use at least 8 characters. The project may require a stronger password.</p>
    <label>Confirm password<input name="confirmPassword" type="password" required minLength={8} maxLength={1024} autoComplete="new-password" /></label>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    <button className={styles.primary} disabled={pending}>{pending ? "Registering…" : "Register as staff"}</button>
    <p className={styles.muted}>Registration creates a login. Access to donor records requires approval by the project owner.</p>
    <p>Already registered? <Link href="/auth/sign-in">Sign in as staff</Link></p>
  </form>;
}

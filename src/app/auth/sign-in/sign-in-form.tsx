"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { signInStaff } from "./actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "@/features/demo-auth/auth.module.css";

export function StaffSignInForm() {
  const [state, action, pending] = useActionState(signInStaff, { error: "" });
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  async function handleGoogle() {
    setGooglePending(true);
    setGoogleError("");
    try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleError(error.message);
      setGooglePending(false);
    }
    } catch {
      setGoogleError("Google sign-in could not start. Check your connection and try again.");
      setGooglePending(false);
    }
  }

  return (
    <div className={styles.form} style={{ maxWidth: 540 }}>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googlePending || pending}
        className={styles.primary}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%" }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.6 33.1 29.8 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l6-6C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-.7-.1-1.3-.2-2l.2-3z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.5 19.2 14 24 14c3 0 5.8 1.1 7.9 3l6-6C34.5 6.5 29.5 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z"/>
          <path fill="#FBBC05" d="M24 45.5c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.5 37 26.9 38 24 38c-5.7 0-10.5-3.8-12.2-9l-7 5.4C8.4 41.7 15.6 45.5 24 45.5z"/>
          <path fill="#EA4335" d="M44.3 23l-.2-3H24v8.5h11.7c-.6 2-1.8 3.7-3.4 5l6.5 5.3c3.8-3.5 6.2-8.7 6.2-14.8 0-.7-.1-1.3-.2-2l.5 1z"/>
        </svg>
        {googlePending ? "Redirecting…" : "Continue with Google"}
      </button>

      {googleError && <p role="alert" className={styles.error}>{googleError}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line, #e5e7eb)" }} />
        <span style={{ fontSize: "0.8rem", color: "var(--muted, #6b7280)", whiteSpace: "nowrap" }}>or sign in with email</span>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line, #e5e7eb)" }} />
      </div>

      <form action={action}>
        <label>Staff email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
        {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
        <button className={styles.primary} disabled={pending || googlePending}>{pending ? "Signing in…" : "Sign in to live workspace"}</button>
      </form>

      <p>Need a login? <Link href="/auth/register">Register as staff</Link></p>
      <p className={styles.muted}>Use an existing Supabase account provisioned as an active admin or board member. This form does not create or promote memberships.</p>
    </div>
  );
}

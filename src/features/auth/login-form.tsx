"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/");
    } catch {
      setError("Could not connect. Check your network.");
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSent(true);
    } catch {
      setError("Could not send link. Check your network.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); setLoading(false); }
    } catch {
      setError("Could not start Google sign-in.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="setup-state">
        <h1>Check your email</h1>
        <p>A sign-in link was sent to <strong>{email}</strong>. Click the link to continue.</p>
      </div>
    );
  }

  return (
    <div className="setup-state">
      <h1>Sign in to Hackleaf</h1>
      <p>Coding in Color board members only.</p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{ marginBottom: "1rem", width: "100%", maxWidth: 320 }}
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p style={{ color: "var(--color-muted)", margin: "0.5rem 0" }}>or sign in with email</p>

      <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 320 }}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p role="alert" style={{ color: "var(--color-error, red)" }}>{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={loading}
        style={{ marginTop: "0.75rem", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: "var(--color-link, inherit)" }}
      >
        Send me a magic link instead
      </button>
    </div>
  );
}

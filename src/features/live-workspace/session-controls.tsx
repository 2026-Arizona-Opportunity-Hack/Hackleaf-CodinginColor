"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutStaff } from "@/app/auth/sign-in/actions";
import type { SessionView } from "./session-view";

// Recheck verified display state when tabs regain focus, after history restore,
// or another tab signs out. No tokens/user records go into browser storage.
export function SessionSync({ session }: { session: SessionView }) {
  const router = useRouter();
  const identity = JSON.stringify(session);
  useEffect(() => {
    let active = true, checking = false;
    const controller = new AbortController();
    async function check() {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const response = await fetch("/auth/session", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (response.ok && active && JSON.stringify(await response.json()) !== identity) router.refresh();
      } catch { /* A temporary network failure must not erase a valid session. */ }
      finally { checking = false; }
    }
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("hackleaf-session");
    if (channel) channel.onmessage = () => { void check(); };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 60000);
    return () => {
      active = false; controller.abort(); channel?.close(); window.clearInterval(timer);
      window.removeEventListener("focus", check); window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [identity, router]);
  return null;
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div><button className="button" disabled={pending} onClick={() => startTransition(async () => {
    setError("");
    try {
      const result = await signOutStaff();
      if (result.error) { setError(result.error); return; }
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("hackleaf-session");
        channel.postMessage("signed-out"); channel.close();
      }
      router.replace("/auth/sign-in"); router.refresh();
    } catch { setError("Sign-out failed. Please try again."); }
  })}>{pending ? "Signing out…" : "Sign out"}</button>{error && <p role="alert">{error}</p>}</div>;
}

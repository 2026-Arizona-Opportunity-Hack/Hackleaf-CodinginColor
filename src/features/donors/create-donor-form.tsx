"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "individual" | "foundation" | "company";

export function CreateDonorForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("individual");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, email: email || undefined, phone: phone || undefined, dateOfBirth: dob || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to create donor.");
        setSaving(false);
        return;
      }
      const donor = await res.json();
      router.push(`/donors/${donor.id}`);
      router.refresh();
    } catch {
      setError("Could not connect. Check your network.");
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "1.5rem", maxWidth: 480, marginTop: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>Register new donor</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          Full name <span aria-hidden>*</span>
          <input type="text" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Type <span aria-hidden>*</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="individual">Individual</option>
            <option value="foundation">Foundation</option>
            <option value="company">Company</option>
          </select>
        </label>
        <label>
          Email
          <input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Phone
          <input type="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </label>
        <label>
          Date of birth
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </label>
        {error && <p role="alert" style={{ color: "var(--color-error, red)", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Create donor"}</button>
          <button type="button" onClick={onClose} style={{ background: "none", border: "1px solid var(--line)" }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

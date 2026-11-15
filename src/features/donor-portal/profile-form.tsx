"use client";

import { useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { validateProfile, type DemoProfile } from "./model";
import { useDemoWorkspace } from "./demo-workspace";
import styles from "./portal.module.css";

export function ProfileForm({ profile, onSave }: { profile?: DemoProfile; onSave: (profile: DemoProfile) => void }) {
  const { profiles } = useDemoWorkspace();
  const [type, setType] = useState<"individual" | "organization">(profile?.type ?? "individual");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const value = validateProfile({ ...Object.fromEntries(fields), is_anonymous: fields.has("is_anonymous") }, profiles, profile?.id);
      onSave({ ...value, id: profile?.id ?? crypto.randomUUID() }); setError("");
    } catch (cause) { setError(cause instanceof ZodError ? cause.issues[0].message : cause instanceof Error ? cause.message : "Check the profile fields."); }
  }
  return <form className={styles.form} onSubmit={submit}>
    <fieldset><legend>Donor details</legend><label>Donor type<select name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="individual">Individual</option><option value="organization">Organization</option></select></label>
      <div className={styles.twoColumns}><label>First name{type === "individual" ? " *" : " (contact person)"}<input name="first_name" autoComplete="given-name" required={type === "individual"} maxLength={100} defaultValue={profile?.first_name} /></label>
        <label>Last name{type === "individual" ? " *" : " (contact person)"}<input name="last_name" autoComplete="family-name" required={type === "individual"} maxLength={100} defaultValue={profile?.last_name} /></label></div>
      <label>Organization name{type === "organization" ? " *" : " (optional)"}<input name="organization_name" autoComplete="organization" required={type === "organization"} maxLength={200} defaultValue={profile?.organization_name} /></label>
    </fieldset>
    <fieldset><legend>Contact information</legend><div className={styles.twoColumns}>
      <label>Email *<input name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={profile?.email} placeholder="donor@example.org" /></label>
      <label>Phone (optional)<input name="phone" type="tel" autoComplete="tel" maxLength={40} defaultValue={profile?.phone} /></label>
    </div><label>Address line (optional)<input name="address_line" autoComplete="street-address" maxLength={200} defaultValue={profile?.address_line} /></label>
      <div className={styles.twoColumns}><label>City (optional)<input name="city" autoComplete="address-level2" maxLength={100} defaultValue={profile?.city} /></label><label>State / region (optional)<input name="state" autoComplete="address-level1" maxLength={100} defaultValue={profile?.state} /></label></div>
      <label>Postal code (optional)<input name="postal_code" autoComplete="postal-code" maxLength={20} defaultValue={profile?.postal_code} /></label>
    </fieldset>
    <fieldset><legend>Privacy and contact preferences</legend>
      <label className={styles.checkbox}><input name="is_anonymous" type="checkbox" defaultChecked={profile?.is_anonymous} />Show my simulated contributions as Anonymous in the NGO demo.</label>
      <label>Do not contact me by<select name="do_not_contact" defaultValue={profile?.do_not_contact ?? "all"}><option value="all">Email or text</option><option value="email">Email</option><option value="text">Text</option><option value="none">No channel blocked</option></select></label>
      <p className={styles.muted}>Your identity remains visible to you in your own profile. No messages are sent by this demo.</p>
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.primary}>{profile ? "Save profile changes" : "Register demo donor"}</button>
  </form>;
}

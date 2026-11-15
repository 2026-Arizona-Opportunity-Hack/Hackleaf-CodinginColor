"use client";

import { useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { demoDate, demoDonors } from "@/lib/demo/data";
import type { Gift } from "@/lib/domain/types";
import { RequestDrawer } from "./request-drawer";
import { parseAmount, programs } from "./requests";
import { GENERAL_SUPPORT } from "./allocation";
import styles from "./requests.module.css";

export function DemoDonationForm({ onSave, onDismiss }: { onSave: (gift: Gift) => void; onDismiss: () => void }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const donorId = String(fields.get("donorId")), programId = String(fields.get("programId"));
      if (!demoDonors.some((donor) => donor.id === donorId) || ![GENERAL_SUPPORT, ...programs.map((program) => program.id)].includes(programId)) throw new Error("Choose a donor and designation.");
      const id = `demo-receipt-${crypto.randomUUID()}`;
      onSave({ id, donorId, programId, amountCents: parseAmount(String(fields.get("amount"))), currency: "USD", receivedOn: demoDate, source: "spreadsheet", sourceRecordId: id });
    } catch (cause) { setError(cause instanceof ZodError ? cause.issues[0].message : cause instanceof Error ? cause.message : "Unable to record demo donation."); }
  }
  return <RequestDrawer title="Record a demo donation" onDismiss={onDismiss}>
    <form onSubmit={submit} className={styles.drawerForm}><div className={styles.formFields}>
      <p className={styles.muted}>Try the funding queue with a fictional receipt. No money is collected or saved to the database.</p>
      <label>Demo donor<select name="donorId">{demoDonors.map((donor) => <option key={donor.id} value={donor.id}>{donor.name}</option>)}</select></label>
      <label>Donation amount (USD)<input name="amount" type="number" min="0.01" step="0.01" max="999999999.99" required placeholder="20.00" /></label>
      <label>Donation designation<select name="programId"><option value={GENERAL_SUPPORT}>General support — follow priority order</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name} only</option>)}</select></label>
      <p className={styles.help}>All Priority 1 requests must fill before new funds reach Priority 2. Program-specific money stays in its program and waits unallocated if necessary. Excess beyond all goals also remains unallocated.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div><footer className={styles.formFooter}><div className={styles.formActions}><button className={styles.primary}>Record demo donation</button><button type="button" className={styles.secondary} onClick={onDismiss}>Cancel</button></div></footer></form>
  </RequestDrawer>;
}

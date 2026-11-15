"use client";

import { useState } from "react";
import { CreateDonorForm } from "./create-donor-form";

export function NewDonorButton() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      {!open && (
        <button type="button" onClick={() => setOpen(true)}>
          + New donor
        </button>
      )}
      {open && <CreateDonorForm onClose={() => setOpen(false)} />}
    </div>
  );
}

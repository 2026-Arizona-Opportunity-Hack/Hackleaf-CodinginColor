"use client";

import { useTransition, useActionState } from "react";
import { approveMember, setMemberActive, setMemberRole } from "./actions";

export function ApproveMemberForm() {
  const [state, action, pending] = useActionState(approveMember, { error: "", message: "" });
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}>
      <label>
        User ID (UUID from their dashboard)
        <input name="userId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily: "monospace" }} />
      </label>
      <label>
        Full name
        <input name="displayName" required maxLength={200} />
      </label>
      <label>
        Role
        <select name="role" defaultValue="board_member">
          <option value="board_member">Board member (read + create)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </label>
      {state.error && <p role="alert" style={{ color: "var(--color-error, red)", margin: 0 }}>{state.error}</p>}
      {state.message && <p role="status" style={{ color: "green", margin: 0 }}>{state.message}</p>}
      <button type="submit" disabled={pending}>{pending ? "Approving…" : "Approve staff member"}</button>
    </form>
  );
}

export function MemberToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setMemberActive(id, !active))}
      style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem" }}
      aria-label={`${active ? "Deactivate" : "Activate"} ${name}`}
    >
      {pending ? "…" : active ? "Deactivate" : "Activate"}
    </button>
  );
}

export function RoleSelect({ id, role }: { id: string; role: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => startTransition(() => setMemberRole(id, e.target.value as "admin" | "board_member"))}
      style={{ fontSize: "0.85rem" }}
    >
      <option value="board_member">Board member</option>
      <option value="admin">Admin</option>
    </select>
  );
}

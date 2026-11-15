import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLiveStaff } from "@/lib/supabase/member";
import { isDemoWorkspace } from "@/lib/workspace";
import { ApproveMemberForm, MemberToggle, RoleSelect } from "./member-controls";

export default async function MembersAdminPage() {
  if (isDemoWorkspace()) {
    return (
      <section style={{ padding: "2rem" }}>
        <h1>Staff members</h1>
        <p>Staff management requires live mode. Set <code>APP_DATA_MODE=live</code> and Supabase credentials.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </section>
    );
  }

  const access = await getLiveStaff();
  if (access.status !== "authorized") {
    return (
      <section style={{ padding: "2rem" }}>
        <h1>Staff members</h1>
        <p>{access.status === "signed_out" ? "Sign in to access this page." : "Admin access required."}</p>
        <Link href={access.status === "signed_out" ? "/auth/sign-in" : "/dashboard"}>
          {access.status === "signed_out" ? "Sign in" : "Back to dashboard"}
        </Link>
      </section>
    );
  }
  if (access.member.role !== "admin") {
    return (
      <section style={{ padding: "2rem" }}>
        <h1>Staff members</h1>
        <p>Admin role required to manage staff memberships.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </section>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from("members")
    .select("id, display_name, role, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <section style={{ padding: "2rem", maxWidth: 800 }}>
      <Link href="/dashboard" style={{ fontSize: "0.9rem" }}>← Dashboard</Link>
      <h1 style={{ marginTop: "0.5rem" }}>Staff members</h1>
      <p style={{ color: "var(--muted, #6b7280)" }}>
        Manage who can access donor records. New registrants appear here once approved.
        Board members can read and create records. Admins have full access.
      </p>

      {members && members.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line, #e5e7eb)", textAlign: "left" }}>
              <th style={{ padding: "0.5rem 0.75rem" }}>Name</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Role</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Status</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--line, #e5e7eb)" }}>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <div>{m.display_name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted, #6b7280)", fontFamily: "monospace" }}>{m.id}</div>
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <RoleSelect id={m.id} role={m.role} />
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <span style={{ color: m.active ? "green" : "var(--muted, #6b7280)" }}>
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <MemberToggle id={m.id} active={m.active} name={m.display_name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ marginBottom: "2rem" }}>No staff members yet.</p>
      )}

      <details open>
        <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "1rem" }}>
          Approve a new staff member
        </summary>
        <p style={{ fontSize: "0.9rem", color: "var(--muted, #6b7280)", marginBottom: "1rem" }}>
          When a user registers and sees &ldquo;access pending&rdquo;, they are shown their User ID on the dashboard.
          Ask them to share it, then enter it below to grant access.
        </p>
        <ApproveMemberForm />
      </details>
    </section>
  );
}

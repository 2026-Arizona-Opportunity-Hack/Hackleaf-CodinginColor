import Link from "next/link";
import { redirect } from "next/navigation";
import { getLiveStaff } from "@/lib/supabase/member";
import { fetchLiveDonors } from "@/features/donors/donor-repository";
import { loadRequestFunding } from "@/features/donation-requests/live-repository";
import { liveFunding } from "@/features/donation-requests/live-contract";
import { formatMoney } from "@/lib/domain/rules";
import { PageHeading } from "@/components/page-heading";

export async function StaffDashboard() {
  const access = await getLiveStaff();
  if (access.status === "signed_out") redirect("/auth/sign-in");
  if (access.status === "forbidden") {
    const issue = access.restriction === "missing_membership" ? "Your login has no matching staff membership in this Supabase project." : access.restriction === "inactive_membership" ? "Your staff membership exists but is inactive." : "Your membership does not have a supported staff role.";
    const funding = await loadRequestFunding().catch(() => null);
    const active = funding?.requests.filter(r => liveFunding(r, funding.allocations).status === "Active");
    const raised = funding?.allocations.reduce((sum,a) => sum+a.amount_cents,0);
    return <section><PageHeading title="Welcome to Hackleaf." description="Manage donation requests from your signed-in account." />
      <p role="status">{issue} Donation-request management does not require staff approval. Donor personal details still follow staff access rules.</p>
      <dl className="metric-strip"><div><dt>Donor details</dt><dd style={{fontSize:24}}>Access pending</dd></div><div><dt>Pending donation requests</dt><dd>{active?.length ?? "Unavailable"}</dd></div><div><dt>Allocated donations</dt><dd>{raised === undefined ? "Unavailable" : formatMoney(raised)}</dd></div></dl>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBlock:24}}><Link className="button" href="/donors">View donors</Link><Link className="button" href="/donation-requests">View donation requests</Link></div>
      <section><h2>Donor details access</h2><p>Ask Vishnu or the Supabase project owner to check this exact Auth user ID in the existing project:</p><p><code style={{overflowWrap:"anywhere"}}>{access.user.id}</code></p><p>The matching <code>public.members</code> row must be active. An approved <code>admin</code> can see all donor records; a <code>board_member</code> sees assigned donors only.</p><p>This membership is only required for donor personal details, not donation requests. This page rechecks access when the tab regains focus and once a minute while visible.</p></section>
    </section>;
  }
  if (access.status !== "authorized") return <section><h1>We could not load your workspace.</h1><p>Your account could not be verified right now. Please refresh to try again.</p></section>;
  const [donors, funding] = await Promise.all([
    fetchLiveDonors(), loadRequestFunding().catch(() => null),
  ]);
  const active = funding?.requests.filter(r => liveFunding(r, funding.allocations).status === "Active");
  const raised = funding?.allocations.reduce((sum,a) => sum+a.amount_cents,0);
  return <><PageHeading title={`Welcome, ${access.member.display_name || "staff member"}.`} description="Your Coding in Color dashboard. Keep donor relationships and request funding moving." />
    <dl className="metric-strip"><div><dt>Donors you can access</dt><dd>{donors === null ? "Unavailable" : donors.length}</dd></div><div><dt>Active donation requests</dt><dd>{active?.length ?? "Unavailable"}</dd></div><div><dt>Allocated toward requests</dt><dd>{raised === undefined ? "Unavailable" : formatMoney(raised)}</dd></div></dl>
    <div className="overview-columns"><section><h2>Your workspace</h2><p>View giving history, follow donor relationships and manage requests in priority order.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}><Link className="button" href="/donors">View donors</Link><Link className="button" href="/donation-requests">Manage donation requests</Link></div></section><aside className="impact-aside"><h2>Account access</h2><p>{access.member.role === "admin" ? "Administrator · Organization-wide donor access" : "Board member · Assigned donor access"}</p><p>Your permissions are checked against your active staff membership.</p>{!funding && <p>Request funding is unavailable. The project owner may need to apply the request-funding migration.</p>}</aside></div>
  </>;
}

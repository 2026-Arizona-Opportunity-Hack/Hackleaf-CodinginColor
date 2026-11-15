import { requireDemoUser } from "@/features/demo-auth/session";
import Link from "next/link";
import { getLiveStaff } from "@/lib/supabase/member";

import { PageHeading } from "@/components/page-heading";
import { DonorDirectory } from "@/features/donors/donor-directory";
import { LiveDonorDirectory } from "@/features/donors/live-donor-directory";
import { isDemoWorkspace } from "@/lib/workspace";
import { fetchLiveDonors } from "@/features/donors/donor-repository";
import { NewDonorButton } from "@/features/donors/new-donor-button";

export default async function DonorsPage() {
  if (isDemoWorkspace()) {
    const user=await requireDemoUser();
    return (
      <>
        <PageHeading title="Every donor belongs here." description="One place for giving history, ownership, and the next conversation." />
        <p role="status">{user.role==='admin'?'Admin · All fictional donor relationships':'Staff / Board member · Assigned donors only (Morgan Chen demo assignment)'}</p><DonorDirectory />
      </>
    );
  }
  const access = await getLiveStaff();
  if (access.status !== "authorized") return <section className="setup-state"><h1>{access.status === "signed_out" ? "Sign in to view live donors." : access.status === "forbidden" ? "Staff access required." : "Live access could not be verified."}</h1><p>An active admin or board-member membership is required to read donor records.</p><Link href={access.status === "signed_out" ? "/auth/sign-in" : "/dashboard"}>{access.status === "signed_out" ? "Staff sign-in" : "Return to dashboard"}</Link></section>;
  const donors = await fetchLiveDonors();
  if (donors === null) return <section className="setup-state"><h1>Donor data is unavailable.</h1><p>The database query failed. Verify table grants, schema and membership policies; this is not an empty donor list.</p></section>;
  return (
    <>
      <PageHeading title="Every donor belongs here." description="One place for giving history, ownership, and the next conversation." />
      <p role="status">{access.member.role === "admin" ? "Admin · You can view all donor relationships and manage staff access." : "Staff / Board member · You can view only donors assigned to you. Other relationships are private."}</p>
      <NewDonorButton />
      <LiveDonorDirectory initialDonors={donors} />
    </>
  );
}

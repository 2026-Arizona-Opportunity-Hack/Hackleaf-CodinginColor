import { DemoAuthForm } from "@/features/demo-auth/auth-form";
import { getDemoUser } from "@/features/demo-auth/session";
import { redirect } from "next/navigation";
import { getLiveStaff } from "@/lib/supabase/member";
import { PageHeading } from "@/components/page-heading";
import { isDemoWorkspace } from "@/lib/workspace";
import { StaffRegistrationForm } from "./register-form";

export default async function RegisterStaffPage() {
  if (isDemoWorkspace()) {
    if(await getDemoUser())redirect("/dashboard");
    return <><PageHeading title="Create a demo staff account." description="Clients, visits and donor relationships in one fictional demo workspace." /><DemoAuthForm register /></>;
  }
  if (!isDemoWorkspace()) {
    const access = await getLiveStaff();
    if ("user" in access && access.user) redirect("/dashboard");
  }
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <><PageHeading title="Register as staff." description="Create your login, then have your project administrator approve staff access." />
    {configured ? <StaffRegistrationForm /> : <p>Supabase connection settings must be completed before registration.</p>}
  </>;
}

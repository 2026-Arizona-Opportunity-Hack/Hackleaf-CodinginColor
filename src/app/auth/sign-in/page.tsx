import { DemoAuthForm } from "@/features/demo-auth/auth-form";
import { getDemoUser } from "@/features/demo-auth/session";
import { redirect } from "next/navigation";
import { getLiveStaff } from "@/lib/supabase/member";
import { PageHeading } from "@/components/page-heading";
import { isDemoWorkspace } from "@/lib/workspace";
import { StaffSignInForm } from "./sign-in-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  if (isDemoWorkspace()) {
    if(await getDemoUser())redirect("/dashboard");
    return <><PageHeading title="Welcome to Hackleaf." description="Clients, visits and donor relationships in one fictional demo workspace." /><DemoAuthForm /></>;
  }
  if (!isDemoWorkspace()) {
    const access = await getLiveStaff();
    if ("user" in access && access.user) redirect("/dashboard");
  }
  const confirmationFailed = (await searchParams).confirmation === "failed";
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <><PageHeading title="Sign in to the live workspace." description="Access the donor records authorized for your staff account." />
    {confirmationFailed && <p role="alert">The confirmation link could not complete sign-in. If your email is verified, sign in below. Otherwise request help from the project owner.</p>}
    {configured ? <StaffSignInForm /> : <p>Supabase connection settings are missing. Complete the local environment configuration first.</p>}
  </>;
}

"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticateDemo } from "./actions";
import { DEMO_ACCOUNTS } from "@/features/case-management/model";
import styles from "@/features/demo-auth/auth.module.css";
export function DemoAuthForm({register=false}:{register?:boolean}) {
  const [state,action,pending]=useActionState(authenticateDemo,{error:""});
  return <><form action={action} className={styles.form} style={{maxWidth:580}}>
    <input type="hidden" name="intent" value={register?"register":"login"} />
    {register && <label>Full name<input name="name" required maxLength={200} autoComplete="name" /></label>}
    <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
    <label>Password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete={register?"new-password":"current-password"} /></label>
    {state.error && <p role="alert">{state.error}</p>}
    <button className={styles.primary} disabled={pending}>{pending?"Please wait…":register?"Create staff account":"Sign in"}</button>
    <p>{register?"New demo accounts have Staff access: read and create records.":"Email/password demo authentication. SQL and external sign-in providers are disabled."}</p>
    <Link href={register?"/auth/sign-in":"/auth/register"}>{register?"Already registered? Sign in":"Register a demo staff account"}</Link>
  </form>{!register && <section style={{marginTop:28}}><h2>Try a demo account</h2><p>Admin: <code>{DEMO_ACCOUNTS.admin.email}</code> · <code>{DEMO_ACCOUNTS.admin.password}</code></p><p>Staff: <code>{DEMO_ACCOUNTS.staff.email}</code> · <code>{DEMO_ACCOUNTS.staff.password}</code></p><p>Fictional demo only. Use fictional information; no email is sent.</p></section>}</>;
}

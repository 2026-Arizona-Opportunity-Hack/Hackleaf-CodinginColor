import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDemoData } from "@/features/case-management/store";
import { isDemoWorkspace } from "@/lib/workspace";
import type { DemoRole } from "@/features/case-management/model";
export const DEMO_COOKIE="hackleaf-demo-session";
export const sessionHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export async function userForToken(token:string|undefined,organization?:string) {
  if(!token || !/^[a-f0-9]{64}$/.test(token) || !isDemoWorkspace()) return null;
  const data=await readDemoData(organization);
  const session=data.sessions.find(s=>s.hash===sessionHash(token) && s.expiresAt>Date.now());
  const user=session && data.users.find(u=>u.id===session.userId && u.active);
  return user?{id:user.id,name:user.name,email:user.email,role:user.role}:null;
}
export const getDemoUser=cache(async()=>userForToken((await cookies()).get(DEMO_COOKIE)?.value));
export async function requireDemoUser(role?:DemoRole) {
  if(!isDemoWorkspace())throw new Error("Client management is available in the local demo only.");
  const user=await getDemoUser();if(!user)redirect("/auth/sign-in");
  if(role && user.role!==role)throw new Error("Administrator access is required for this action.");
  return user;
}

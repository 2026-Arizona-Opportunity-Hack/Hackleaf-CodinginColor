"use server";
import { randomBytes,randomUUID } from "node:crypto";
import { cookies,headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoWorkspace } from "@/lib/workspace";
import { mutateDemoData,passwordHash,verifyPassword } from "@/features/case-management/store";
import { auditSummary,recordAudit } from "@/features/case-management/audit";
import { DEMO_COOKIE,sessionHash } from "./session";
const credentials=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(8).max(128)});
export async function authenticateDemo(_previous:{error:string},form:FormData):Promise<{error:string}> {
  if(!isDemoWorkspace())return {error:"Local demo accounts are disabled in live mode."};
  const parsed=credentials.safeParse({email:String(form.get("email")??"").trim(),password:form.get("password")});
  if(!parsed.success)return {error:"Enter a valid email and a password of at least 8 characters."};
  const registering=form.get("intent")==="register";
  const name=String(form.get("name")??"").trim();
  if(registering && (!name || name.length>200))return {error:"Enter your name (up to 200 characters)."};
  const token=randomBytes(32).toString("hex");
  try{
    await mutateDemoData(async data=>{
      const before=auditSummary(data,"session");
      let user=data.users.find(u=>u.email===parsed.data.email);
      if(registering){
        if(user)throw new Error("This demo email is already registered. Sign in instead.");
        const salt=randomBytes(16).toString("hex");
        user={id:randomUUID(),name,email:parsed.data.email,role:"staff",active:true,salt,passwordHash:await passwordHash(parsed.data.password,salt)};data.users.push(user);
      } else if(!user || !user.active || !(await verifyPassword(parsed.data.password,user)))throw new Error("Email or password is incorrect.");
      data.sessions=data.sessions.filter(s=>s.expiresAt>Date.now());
      data.sessions.push({hash:sessionHash(token),userId:user!.id,expiresAt:Date.now()+8*60*60*1000});
      recordAudit(data,user!,registering?"account.create":"session.create",registering?"account":"session",before,auditSummary(data,"session"),["session"]);
    });
    const secure=(await headers()).get("x-forwarded-proto")==="https";
    (await cookies()).set(DEMO_COOKIE,token,{httpOnly:true,sameSite:"lax",secure,path:"/",maxAge:8*60*60});
  }catch(error){return {error:error instanceof Error?error.message:"The demo could not sign you in."};}
  revalidatePath("/","layout");redirect("/dashboard");
}
export async function signOutDemo():Promise<{error:string}> {
  if(!isDemoWorkspace())return {error:"Not a demo session."};
  try{
    const store=await cookies(),token=store.get(DEMO_COOKIE)?.value;
    if(token)await mutateDemoData(data=>{const current=data.sessions.find(s=>s.hash===sessionHash(token));const actor=data.users.find(u=>u.id===current?.userId);const before=auditSummary(data,"session");data.sessions=data.sessions.filter(s=>s.hash!==sessionHash(token));if(actor)recordAudit(data,actor,"session.delete","session",before,auditSummary(data,"session"),["session"]);});
    store.delete(DEMO_COOKIE);revalidatePath("/","layout");return {error:""};
  }catch{return {error:"Could not sign out. Please retry."};}
}

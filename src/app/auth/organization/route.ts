import { sameOrigin } from "@/features/client-p2/request-origin";
import { NextRequest,NextResponse } from "next/server";
import { tenantId,TENANT_COOKIE } from "@/features/client-p2/tenants";
import { DEMO_COOKIE,sessionHash } from "@/features/demo-auth/session";
import { mutateDemoData } from "@/features/case-management/store";
import { auditSummary,recordAudit } from "@/features/case-management/audit";
import { isDemoWorkspace } from "@/lib/workspace";
export async function POST(request:NextRequest){
 if(!isDemoWorkspace())return new Response(null,{status:404});
 if(!sameOrigin(request))return new Response(null,{status:403});
 try{const id=tenantId(String((await request.formData()).get("organization"))),token=request.cookies.get(DEMO_COOKIE)?.value;
 if(token)await mutateDemoData(data=>{const session=data.sessions.find(s=>s.hash===sessionHash(token)),actor=data.users.find(u=>u.id===session?.userId);if(actor){const before=auditSummary(data,"session");data.sessions=data.sessions.filter(s=>s.hash!==sessionHash(token));recordAudit(data,actor,"session.delete","session",before,auditSummary(data,"session"),["session"]);}});
 const response=NextResponse.redirect(new URL("/auth/sign-in",request.headers.get("origin")!),303);response.cookies.delete(DEMO_COOKIE);response.cookies.set(TENANT_COOKIE,id,{httpOnly:true,sameSite:"lax",secure:request.nextUrl.protocol==="https:",path:"/",maxAge:31536000});response.headers.set("Cache-Control","private, no-store");return response;
 }catch{return Response.json({error:"Choose a listed organization."},{status:400});}
}

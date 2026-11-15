import { randomUUID } from "node:crypto";
import { getDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";
import { sameOrigin } from "@/features/client-p2/request-origin";
import { limitedBytes } from "@/features/client-p2/request-body";
import { signUpload,uploadMetadata } from "@/features/client-p2/document-intent";
export const runtime="nodejs";
export async function POST(request:Request){
 const actor=await getDemoUser();if(!actor)return new Response(null,{status:401});if(!sameOrigin(request)||isDemoWorkspace())return new Response(null,{status:403});
 try{const meta=uploadMetadata.parse(JSON.parse(new TextDecoder().decode(await limitedBytes(request,4000)))),workspace=await readDemoData();if(!workspace.clients.some(c=>c.id===meta.clientId))return new Response(null,{status:404});if((workspace.documents??[]).filter(d=>d.clientId===meta.clientId).length>=20)throw new Error("A client may have at most 20 documents.");
 const intent={...meta,id:randomUUID(),createdBy:actor.id,expires:Date.now()+10*60000},path=`coding-in-color/${actor.id}/${intent.id}`;
 const db=await createSupabaseServerClient(),{data,error}=await db.storage.from("case-documents").createSignedUploadUrl(path);if(error||!data)throw new Error("Private storage is not ready. Apply the storage migration.");
 return Response.json({path,token:data.token,intent:signUpload(intent)},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"Could not prepare a private upload. Check client access, file type/size and storage setup."},{status:400});}
}

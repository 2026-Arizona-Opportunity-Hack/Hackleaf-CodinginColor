import { sameOrigin } from "@/features/client-p2/request-origin";
import { limitedForm } from "@/features/client-p2/request-body";
import { randomUUID } from "node:crypto";
import { mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { getDemoUser } from "@/features/demo-auth/session";
import { demoDirectory,mutateDemoData } from "@/features/case-management/store";
import { auditSummary,recordAudit } from "@/features/case-management/audit";
import { MAX_DOCUMENT,documentType,safeDocumentName } from "@/features/client-p2/documents";
export const runtime="nodejs";
export async function POST(request:Request){const actor=await getDemoUser();if(!actor)return Response.json({error:"Sign in first."},{status:401});if(!sameOrigin(request))return new Response(null,{status:403});
 if(Number(request.headers.get("content-length"))>MAX_DOCUMENT+100000)return Response.json({error:"Maximum file size is 5 MB."},{status:413});
 let path:string|undefined;try{const form=await limitedForm(request,MAX_DOCUMENT+100000),file=form.get("file"),clientId=String(form.get("clientId"));if(!(file instanceof File)||!file.size||file.size>MAX_DOCUMENT)throw new Error("Choose a nonempty file up to 5 MB.");const bytes=new Uint8Array(await file.arrayBuffer()),type=documentType(bytes),id=randomUUID(),dir=join(await demoDirectory(),"documents");
 await mkdir(dir,{recursive:true,mode:0o700});path=join(dir,id);await writeFile(path,bytes,{mode:0o600});
 await mutateDemoData(data=>{if(!data.clients.some(c=>c.id===clientId))throw new Error("Client not found.");const before=auditSummary(data,"document");data.documents??=[];if(data.documents.filter(d=>d.clientId===clientId).length>=20)throw new Error("A client may have at most 20 documents.");data.documents.push({id,clientId,name:safeDocumentName(file.name),type,size:file.size,createdAt:new Date().toISOString(),createdBy:actor.id});recordAudit(data,actor,"document.create","document",before,auditSummary(data,"document"),["records"]);});return Response.json({id},{status:201,headers:{"Cache-Control":"private, no-store"}});
 }catch(error){if(path)await rm(path,{force:true});return Response.json({error:error instanceof Error?error.message:"Upload failed."},{status:400});}}

import { getDemoUser } from "@/features/demo-auth/session";
import { mutateDemoData } from "@/features/case-management/store";
import { sameOrigin } from "@/features/client-p2/request-origin";
import { limitedBytes } from "@/features/client-p2/request-body";
import { verifyUpload } from "@/features/client-p2/document-intent";
import { documentType,safeDocumentName } from "@/features/client-p2/documents";
import { readDocumentFile,removeDocumentFile } from "@/features/client-p2/document-storage";
import { auditSummary,recordAudit } from "@/features/case-management/audit";
export const runtime="nodejs";
export async function POST(request:Request){
 const actor=await getDemoUser();if(!actor)return new Response(null,{status:401});if(!sameOrigin(request))return new Response(null,{status:403});
 try{const body=JSON.parse(new TextDecoder().decode(await limitedBytes(request,5000)));if(typeof body.intent!=="string")throw new Error("Missing upload intent.");const intent=verifyUpload(body.intent,actor.id),doc={id:intent.id,clientId:intent.clientId,createdBy:actor.id,name:safeDocumentName(intent.name),type:intent.type,size:intent.size,createdAt:new Date().toISOString()};
 const bytes=await readDocumentFile(doc);if(bytes.length!==intent.size||documentType(bytes)!==intent.type){await removeDocumentFile(doc);throw new Error("The uploaded bytes do not match the requested file type or size.");}
 await mutateDemoData(data=>{if(!data.clients.some(c=>c.id===doc.clientId))throw new Error("Client no longer exists.");data.documents??=[];if(data.documents.some(d=>d.id===doc.id))return;if(data.documents.filter(d=>d.clientId===doc.clientId).length>=20)throw new Error("Client document limit reached.");const before=auditSummary(data,"document");data.documents.push(doc);recordAudit(data,actor,"document.create","document",before,auditSummary(data,"document"),["records"]);});
 return Response.json({id:doc.id},{status:201,headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Could not finish private upload."},{status:400,headers:{"Cache-Control":"private, no-store"}});}
}

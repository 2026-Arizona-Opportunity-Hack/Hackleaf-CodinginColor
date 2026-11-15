import { limitedBytes } from "@/features/client-p2/request-body";
import { mutateDemoData } from "@/features/case-management/store";
import { tenantId } from "@/features/client-p2/tenants";
import { applyWebhook } from "@/features/client-p2/webhooks";
import { isDemoWorkspace } from "@/lib/workspace";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { webhookInput } from "@/features/client-p2/webhooks";
import { clientInput } from "@/features/case-management/model";
export const runtime='nodejs';
export async function POST(request:Request){const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token||!/^hl_[a-f0-9]{64}$/.test(token))return new Response(null,{status:401});if(Number(request.headers.get('content-length'))>100000)return new Response(null,{status:413});try{const organization=tenantId(request.headers.get('x-hackleaf-organization')??'invalid'),raw=new TextDecoder().decode(await limitedBytes(request,100000));if(new TextEncoder().encode(raw).length>100000)return new Response(null,{status:413});const body=JSON.parse(raw);let result:{clientId:string;replayed:boolean};
 if(isDemoWorkspace())result=await mutateDemoData(data=>applyWebhook(data,token,body),organization);
 else{if(organization!=="coding-in-color")return new Response(null,{status:403});const input=webhookInput.parse(body),client=clientInput.parse(input.client),db=await createSupabaseServerClient(),response=await db.rpc("case_webhook_ingest",{p_token:token,p_external_id:input.external_id,p_client:client});if(response.error?.code==="42501")return new Response(null,{status:401});if(response.error)throw new Error("Webhook could not be saved. Check the client fields, external ID and integration setup.");result=response.data as typeof result;}
 return Response.json(result,{status:result.replayed?200:201,headers:{'Cache-Control':'private, no-store'}});}catch(e){if(e instanceof Error&&e.message==='unauthorized')return new Response(null,{status:401});return Response.json({error:e instanceof z.ZodError?'Invalid client fields.':e instanceof SyntaxError?'Invalid JSON.':e instanceof Error?e.message:'Webhook failed.'},{status:400});}}

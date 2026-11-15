import { getDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { sameOrigin } from "@/features/client-p2/request-origin";
import { limitedBytes } from "@/features/client-p2/request-body";
import { consumeRate } from "@/features/assistant/security";
import { summaryPeriod,summaryFacts,factualBrief } from "@/features/case-management/dashboard-summary";
import { dashboardAIEnabled,aiDashboardBrief } from "@/features/case-management/dashboard-summary-ai";
import { z } from "zod";
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){const user=await getDemoUser();if(!user)return Response.json({error:'Sign in to summarize this workspace.'},{status:401,headers});if(!sameOrigin(request))return Response.json({error:'Request must come from this app.'},{status:403,headers});
 try{const body=z.object({period:summaryPeriod}).strict().parse(JSON.parse(new TextDecoder().decode(await limitedBytes(request,2048)))),facts=summaryFacts(await readDemoData(),body.period,today()),fallback=factualBrief(facts);
 if(!dashboardAIEnabled())return Response.json(fallback,{headers});
 if(!consumeRate(`dashboard-brief:${user.id}`,6,60000)||!consumeRate('demo-global-day',120,86400000))return Response.json({...fallback,notice:'AI request limit reached. Showing the factual brief.'},{headers});
 try{const text=await aiDashboardBrief(facts,AbortSignal.any([request.signal,AbortSignal.timeout(20000)]));return Response.json({...fallback,text,mode:'ai',notice:'AI selected these highlights; wording and numbers come from saved records.'},{headers});}catch{return Response.json({...fallback,notice:'AI is unavailable right now. Showing the factual brief.'},{headers});}
 }catch{return Response.json({error:'Choose Today, Month, Year or All time.'},{status:400,headers});}}

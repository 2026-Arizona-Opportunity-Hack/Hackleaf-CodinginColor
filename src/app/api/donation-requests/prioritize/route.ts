import { z } from 'zod';
import { isDemoWorkspace } from '@/lib/workspace';
import { getDemoUser } from '@/features/demo-auth/session';
import { sameOrigin } from '@/features/client-p2/request-origin';
import { limitedBytes } from '@/features/client-p2/request-body';
import { demoSnapshotSchema } from '@/features/assistant/contracts';
import { demoAIEnabled } from '@/features/assistant/config';
import { consumeRate } from '@/features/assistant/security';
import { allocateDonations } from '@/features/donation-requests/allocation';
import { assignPriorities,rankableRequests } from '@/features/donation-requests/priority-planner';
import { aiPriorityOrder } from '@/features/donation-requests/priority-ai';
import { today } from '@/features/case-management/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){if(!isDemoWorkspace())return new Response(null,{status:404,headers});const user=await getDemoUser();if(!user)return new Response(null,{status:401,headers});if(!sameOrigin(request))return new Response(null,{status:403,headers});
 try{const {giving}=z.object({giving:demoSnapshotSchema.shape.giving}).strict().parse(JSON.parse(new TextDecoder().decode(await limitedBytes(request,300000))));
 allocateDonations(giving.requests,giving.gifts,giving.allocations);const candidates=rankableRequests(giving.requests,giving.allocations),order=candidates.map(r=>r.id),fallback={mode:'unchanged',order,notice:'AI is off. Current priorities are kept; cards remain in ascending order.'};
 if(candidates.length<2)return Response.json({...fallback,notice:'Fewer than two unfunded active requests. Existing priorities are kept.'},{headers});
 if(!demoAIEnabled())return Response.json(fallback,{headers});
 if(!consumeRate(`request-priority:${user.id}`,6,60000)||!consumeRate('demo-global-day',120,86400000))return Response.json({...fallback,notice:'AI request limit reached. Existing priorities are kept.'},{headers});
 try{const ranked=await aiPriorityOrder(candidates,today(),AbortSignal.any([request.signal,AbortSignal.timeout(20000)]));assignPriorities(giving.requests,giving.allocations,ranked);return Response.json({mode:'ai',order:ranked,notice:'AI assigned unique priorities to unfunded active requests. Funded priorities and existing allocations are preserved.'},{headers});}catch{return Response.json({...fallback,notice:'AI ranking is unavailable. Existing priorities are kept.'},{headers});}
 }catch{return Response.json({error:'The request queue or allocation data is invalid. Refresh and try again.'},{status:400,headers});}}

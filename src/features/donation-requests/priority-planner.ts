import type { DonationRequest } from './requests';
import { funding } from './requests';
import type { Allocation } from './allocation';
export function priorityOrder<T extends {priority:number;id:string}>(requests:readonly T[]){return [...requests].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));}
export function rankableRequests(requests:readonly DonationRequest[],allocations:readonly Allocation[]){return priorityOrder(requests).filter(r=>r.state==='active'&&funding(r,allocations).raisedCents===0);}
export function assignPriorities(requests:readonly DonationRequest[],allocations:readonly Allocation[],order:readonly string[]){
 if(new Set(requests.map(r=>r.id)).size!==requests.length||new Set(requests.map(r=>r.priority)).size!==requests.length)throw new Error('Request IDs and priorities must be unique.');
 const candidates=rankableRequests(requests,allocations),expected=new Set(candidates.map(r=>r.id));
 if(order.length!==expected.size||new Set(order).size!==order.length||order.some(id=>!expected.has(id)))throw new Error('AI must rank every eligible request exactly once.');
 const funded=requests.filter(r=>funding(r,allocations).raisedCents>0),locked=new Map(funded.map(r=>[r.id,r.priority]));
 let next=Math.max(0,...funded.map(r=>r.priority))+1;const priorities=new Map(locked);
 for(const id of [...order,...priorityOrder(requests.filter(r=>r.state==='draft'&&!locked.has(r.id))).map(r=>r.id)]){if(!Number.isSafeInteger(next))throw new Error('Priority range is exhausted.');priorities.set(id,next++);}
 const result=requests.map(r=>({...r,priority:priorities.get(r.id)??r.priority}));
 if(new Set(result.map(r=>r.priority)).size!==result.length)throw new Error('Priorities must remain unique.');return priorityOrder(result);
}

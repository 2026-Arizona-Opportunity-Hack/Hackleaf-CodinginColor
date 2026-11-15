import { z } from "zod";
import { phoenixParts } from "./dates";
import type { DemoData } from "./model";
export const summaryPeriod=z.enum(['today','month','year','all']);
export type SummaryPeriod=z.infer<typeof summaryPeriod>;
export const summaryLabels:Record<SummaryPeriod,string>={today:'Today',month:'Month',year:'Year',all:'All time'};
const noun=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
export function summaryFacts(data:DemoData,period:SummaryPeriod,asOf:string){
 const start=period==='today'?asOf:period==='month'?asOf.slice(0,7)+'-01':period==='year'?asOf.slice(0,4)+'-01-01':null,inPeriod=(date:string)=>date<=asOf&&(!start||date>=start),ids=new Set(data.clients.map(c=>c.id));
 const visits=data.visits.filter(v=>ids.has(v.clientId)&&inPeriod(v.date)),served=new Set(visits.map(v=>v.clientId)).size,appointments=data.appointments.filter(a=>ids.has(a.clientId)&&inPeriod(a.date)),scheduled=appointments.filter(a=>a.status==='scheduled').length,completed=appointments.filter(a=>a.status==='completed').length,cancelled=appointments.filter(a=>a.status==='cancelled').length;
 const newClients=data.clients.filter(c=>{const date=new Date(c.createdAt);return Number.isFinite(date.getTime())&&inPeriod(phoenixParts(date).date);}).length,active=data.clients.filter(c=>c.active).length;
 const intro={today:'Today',month:'This month so far',year:'This year so far',all:'Across all recorded dates'}[period];
 const facts={activity:visits.length?`${intro}, your team recorded ${noun(visits.length,'service')} for ${noun(served,'person','people')}.`:`${intro}, no services were recorded.`,appointments:appointments.length?`${noun(scheduled,'appointment')} ${scheduled===1?'is':'are'} marked scheduled, ${completed} completed and ${cancelled} cancelled for these dates.`:'There are no appointment records for these dates.',registrations:`${noun(newClients,'new client record')} ${newClients===1?'was':'were'} added during this period.`,directory:`Your directory currently has ${noun(data.clients.length,'client')}, including ${active} active.`};
 return {period,start,end:asOf,facts,counts:{services:visits.length,served,scheduled,completed,cancelled,newClients,clients:data.clients.length,active}};
}
export type SummaryFacts=ReturnType<typeof summaryFacts>;
export const selectedFacts=z.object({selected:z.array(z.enum(['appointments','registrations','directory'])).min(1).max(2)}).strict();
export function renderBrief(data:SummaryFacts,selected:('appointments'|'registrations'|'directory')[]=['appointments','directory']){return [data.facts.activity,...[...new Set(selected)].slice(0,2).map(id=>data.facts[id])].join(' ');}
export interface DashboardBrief {period:SummaryPeriod;start:string|null;end:string;text:string;mode:'facts'|'ai';notice:string}
export function factualBrief(data:SummaryFacts,notice='AI is off. This brief is calculated directly from saved records.'):DashboardBrief{return {period:data.period,start:data.start,end:data.end,text:renderBrief(data),mode:'facts',notice};}

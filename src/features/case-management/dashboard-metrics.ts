import { addDays,appointmentStart,phoenixParts } from "./dates";
import type { DemoData } from "./model";
export const DASHBOARD_PERIODS=[7,30,90] as const;
export const percent=(part:number,total:number)=>total>0?part/total*100:0;
export function dashboardMetrics(data:DemoData,asOf:string,days:number,now:number){
  if(!DASHBOARD_PERIODS.includes(days as 7|30|90))throw new Error("Choose a supported dashboard period.");
  const start=addDays(asOf,1-days),previousStart=addDays(start,-days),previousEnd=addDays(start,-1),clientIds=new Set(data.clients.map(c=>c.id));
  const allVisits=data.visits.filter(v=>clientIds.has(v.clientId)&&v.date<=asOf),visits=allVisits.filter(v=>v.date>=start),previous=allVisits.filter(v=>v.date>=previousStart&&v.date<=previousEnd);
  const byClient=new Map<string,number>();for(const visit of visits)byClient.set(visit.clientId,(byClient.get(visit.clientId)??0)+1);
  const served=byClient.size,repeat=[...byClient.values()].filter(n=>n>1).length,active=data.clients.filter(c=>c.active).length;
  const series=Array.from({length:days},(_,i)=>{const date=addDays(start,i),previousDate=addDays(previousStart,i);return {date,count:visits.filter(v=>v.date===date).length,previousDate,previous:previous.filter(v=>v.date===previousDate).length};});
  const types=[...new Set(visits.map(v=>v.serviceTypeId))].map(id=>({id,label:data.serviceTypes.find(t=>t.id===id)?.label??visits.find(v=>v.serviceTypeId===id)!.serviceTypeLabel,count:visits.filter(v=>v.serviceTypeId===id).length})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const staff=[...new Set(visits.map(v=>v.staffId))].map(id=>({id,name:data.users.find(u=>u.id===id)?.name??visits.find(v=>v.staffId===id)!.staffName,count:visits.filter(v=>v.staffId===id).length})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  const periodAppointments=data.appointments.filter(a=>a.date>=start&&a.date<=asOf),completed=periodAppointments.filter(a=>a.status==='completed').length,cancelled=periodAppointments.filter(a=>a.status==='cancelled').length,scheduled=periodAppointments.filter(a=>a.status==='scheduled').length;
  const next7=data.appointments.filter(a=>a.status==='scheduled'&&appointmentStart(a)>=now&&appointmentStart(a)<now+7*86400000).length;
  const fields=data.fields.filter(f=>f.active),expectedCells=data.clients.length*(3+fields.length);let filledCells=0;
  for(const c of data.clients){filledCells+=Number(!!c.name.trim())+Number(!!c.dateOfBirth)+Number(!!(c.email.trim()||c.phone.trim()))+fields.filter(f=>!!c.demographics[f.id]?.trim()).length;}
  const ages=[{label:'Under 18',count:0},{label:'18–34',count:0},{label:'35–54',count:0},{label:'55+',count:0},{label:'Unknown',count:0}];
  for(const c of data.clients){const birth=new Date(`${c.dateOfBirth}T12:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(c.dateOfBirth)||!Number.isFinite(birth.getTime())||birth.toISOString().slice(0,10)!==c.dateOfBirth||c.dateOfBirth>asOf){ages[4].count++;continue;}const age=Number(asOf.slice(0,4))-Number(c.dateOfBirth.slice(0,4))-Number(asOf.slice(5)<c.dateOfBirth.slice(5));ages[age<18?0:age<35?1:age<55?2:3].count++;}
  const newClients=data.clients.filter(c=>{const date=new Date(c.createdAt);return Number.isFinite(date.getTime())&&phoenixParts(date).date>=start&&phoenixParts(date).date<=asOf;}).length;
  return {asOf,start,previousStart,previousEnd,days,clients:data.clients.length,active,inactive:data.clients.length-active,newClients,services:visits.length,previousServices:previous.length,serviceDifference:visits.length-previous.length,serviceChange:previous.length?(visits.length-previous.length)/previous.length*100:null,served,repeat,reach:percent(served,data.clients.length),repeatRate:percent(repeat,served),visitsPerClient:served?visits.length/served:0,visitsPerDay:visits.length/days,series,types,staff,completed,cancelled,scheduled,appointmentTotal:periodAppointments.length,completionRate:completed+cancelled?percent(completed,completed+cancelled):null,next7,expectedCells,filledCells,missingCells:expectedCells-filledCells,completeness:percent(filledCells,expectedCells),emailCount:data.clients.filter(c=>!!c.email.trim()).length,phoneCount:data.clients.filter(c=>!!c.phone.trim()).length,ages,neverServed:data.clients.filter(c=>!allVisits.some(v=>v.clientId===c.id)).length};
}
export type DashboardMetrics=ReturnType<typeof dashboardMetrics>;

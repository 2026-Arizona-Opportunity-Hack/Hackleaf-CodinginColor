import { addDays,weekStart } from "./dates";
import type { DemoData } from "./model";
export function reportData(data:DemoData,asOf:string,start:string,end:string){
  const monthStart=`${asOf.slice(0,7)}-01`,quarterStart=`${asOf.slice(0,4)}-${String(Math.floor((Number(asOf.slice(5,7))-1)/3)*3+1).padStart(2,"0")}-01`;
  const count=(from:string)=>data.visits.filter(v=>v.date>=from&&v.date<=asOf).length;
  const selected=data.visits.filter(v=>v.date>=start&&v.date<=end);
  const series:{date:string;count:number}[]=[];for(let day=start;day<=end;day=addDays(day,1)){series.push({date:day,count:selected.filter(v=>v.date===day).length});if(series.length>366)throw new Error("Choose a reporting range of at most one year.");}
  const types=new Map<string,{id:string;label:string;count:number}>();for(const visit of selected){const current=types.get(visit.serviceTypeId);if(current)current.count++;else types.set(visit.serviceTypeId,{id:visit.serviceTypeId,label:data.serviceTypes.find(t=>t.id===visit.serviceTypeId)?.label??visit.serviceTypeLabel,count:1});}
  return {activeClients:data.clients.filter(c=>c.active).length,week:count(weekStart(asOf)),month:count(monthStart),quarter:count(quarterStart),selectedCount:selected.length,series,types:[...types.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))};
}

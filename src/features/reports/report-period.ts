import { z } from 'zod';
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export function monthYear(date:string) {
  return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date.slice(0,7)}-01T12:00:00Z`));
}
export function reportingMonths(start:string,end:string,asOf:string) {
  const first=month.parse(start),last=month.parse(end);
  if(first>last||last>asOf.slice(0,7))throw new Error('Choose a valid month range ending this month or earlier.');
  const [year,m]=last.split('-').map(Number),lastDay=new Date(Date.UTC(year,m,0)).toISOString().slice(0,10);
  return {start:`${first}-01`,end:lastDay>asOf?asOf:lastDay};
}

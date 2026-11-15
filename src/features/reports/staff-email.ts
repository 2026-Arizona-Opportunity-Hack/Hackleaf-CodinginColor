import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DemoData } from '@/features/case-management/model';
import { today } from '@/features/case-management/model';
import { summaryFacts, renderBrief } from '@/features/case-management/dashboard-summary';

export interface StaffEmailJob {
  id:string; at:string; subject:string; text:string; from:string; to:string[];
  state:'pending'|'accepted'|'failed'; attempts:number; nextAttemptAt:number; providerId?:string;
}
const labels:Record<string,string> = {
  'client.create':'A new client was registered.', 'client.import':'Client records were imported.',
  'client.webhook_create':'A new client arrived through an integration.',
  'visit.create':'A service was logged.', 'appointment.create':'An appointment was scheduled.',
  'appointment.update':'An appointment was updated.', 'appointment.cancel':'An appointment was cancelled.',
  'appointment.complete':'An appointment was completed.',
};
const configSchema=z.object({key:z.string().min(1),from:z.email(),to:z.array(z.email()).min(1).max(5)});
export function staffEmailConfig() {
  if(process.env.STAFF_EMAIL_ENABLED!=='true')return null;
  const result=configSchema.safeParse({key:process.env.RESEND_API_KEY,from:process.env.STAFF_EMAIL_FROM?.trim(),to:process.env.STAFF_EMAIL_RECIPIENTS?.split(',').map(s=>s.trim()).filter(Boolean)});
  return result.success?result.data:null;
}
export function emailOrganization() { return process.env.STAFF_EMAIL_ORGANIZATION || 'coding-in-color'; }

export function queueStaffEmail(data:DemoData,previous:Set<string>,organization:string) {
  const config=staffEmailConfig();
  if(!config || organization!==emailOrganization())return;
  const events=data.audit.filter(event=>!previous.has(event.id)&&labels[event.action]);
  if(!events.length)return;
  data.staffEmails??=[];
  const id=createHash('sha256').update(organization+events.map(e=>e.id).sort().join(':')).digest('hex');
  if(data.staffEmails.some(job=>job.id===id))return;
  const date=today(),activity=[...new Set(events.map(e=>labels[e.action]))].join('\n');
  data.staffEmails.push({id,at:new Date().toISOString(),subject:`Hackleaf staff alert — ${date}`,
    text:`Important workspace activity\n\n${activity}\n\nToday's dashboard\n${renderBrief(summaryFacts(data,'today',date))}\n\nAmerica/Phoenix. Fictional demo records; SQL is disabled. No client names or notes are included. Funding simulation is separate.`,
    from:config.from,to:[...new Set(config.to)],state:'pending',attempts:0,nextAttemptAt:0});
  const terminal=data.staffEmails.filter(job=>job.state!=='pending').slice(-50);
  data.staffEmails=[...terminal,...data.staffEmails.filter(job=>job.state==='pending')];
}

// Provider IDs mean accepted for delivery, never proof of inbox delivery.
export async function deliverStaffEmail(data:DemoData,organization:string,now=Date.now()) {
  const config=staffEmailConfig();
  if(!config || organization!==emailOrganization())return false;
  const job=data.staffEmails?.slice().reverse().find(job=>job.state==='pending'&&job.nextAttemptAt<=now);
  if(!job)return false;
  // Stop before the provider's 24-hour idempotency window expires. Removed
  // recipients cannot receive a queued email after configuration changes.
  if(now-new Date(job.at).getTime()>23*3600000 || job.from!==config.from || job.to.some(to=>!config.to.includes(to))) { job.state='failed'; return true; }
  job.attempts++;
  try {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',
      headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':`staff-alert/${job.id}`},
      body:JSON.stringify({from:job.from,to:job.to,subject:job.subject,text:job.text}),signal:AbortSignal.timeout(3000)});
    if(response.ok) {
      const result=z.object({id:z.string().min(1).max(200)}).parse(await response.json());
      job.state='accepted';job.providerId=result.id;
    } else if(response.status===429 || response.status>=500) throw new Error('retry');
    else job.state='failed';
  } catch {
    job.state=job.attempts>=5?'failed':'pending';
    job.nextAttemptAt=now+Math.min(3600000,60000*2**(job.attempts-1));
  }
  return true;
}

export function staffEmailStatus(data:DemoData,organization:string) {
  const configured=!!staffEmailConfig()&&organization===emailOrganization(),jobs=data.staffEmails??[];
  return {configured,pending:jobs.filter(j=>j.state==='pending').length,failed:jobs.filter(j=>j.state==='failed').length,
    accepted:jobs.filter(j=>j.state==='accepted').length};
}

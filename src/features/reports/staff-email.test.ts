import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/features/client-p2/tenant-server',()=>({currentTenant:async()=> 'coding-in-color'}));
import { readDemoData,mutateDemoData } from '@/features/case-management/store';
import { recordAudit } from '@/features/case-management/audit';
import { deliverStaffEmail,queueStaffEmail,staffEmailConfig } from './staff-email';
import { POST } from '@/app/api/reports/staff-email-retry/route';
let dir:string;
const provider=vi.fn();
beforeEach(async()=>{
  dir=await mkdtemp(join(tmpdir(),'hackleaf-staff-mail-'));
  for(const [key,value] of Object.entries({APP_DATA_MODE:'demo',DEMO_DATA_DIR:dir,STAFF_EMAIL_ENABLED:'true',RESEND_API_KEY:'test-key',STAFF_EMAIL_FROM:'alerts@example.org',STAFF_EMAIL_RECIPIENTS:'staff@example.org',STAFF_EMAIL_ORGANIZATION:'coding-in-color',STAFF_EMAIL_CRON_SECRET:'test-secret-with-at-least-32-characters'}))vi.stubEnv(key,value);
  provider.mockReset();provider.mockResolvedValue(Response.json({id:'email-provider-id'}));vi.stubGlobal('fetch',provider);
});
afterEach(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();await rm(dir,{recursive:true,force:true});});
const event=(data:Awaited<ReturnType<typeof readDemoData>>,action='client.create')=>recordAudit(data,{id:'staff',name:'Private actor'},action,'client',{}, {},[]);

it('does not send for seeds, disabled/missing configuration or another organization',async()=>{
  const data=await readDemoData();expect(provider).not.toHaveBeenCalled();event(data);
  queueStaffEmail(data,new Set(),'hope-aid');expect(data.staffEmails).toBeUndefined();
  vi.stubEnv('STAFF_EMAIL_ENABLED','false');queueStaffEmail(data,new Set(),'coding-in-color');expect(data.staffEmails).toBeUndefined();
  vi.stubEnv('STAFF_EMAIL_ENABLED','true');vi.stubEnv('STAFF_EMAIL_FROM','invalid');expect(staffEmailConfig()).toBeNull();
});

it('queues only new important audit events, deduplicates them and excludes private data',async()=>{
  const data=await readDemoData(),previous=new Set(data.audit.map(e=>e.id));
  event(data,'appointment.snooze');queueStaffEmail(data,previous,'coding-in-color');expect(data.staffEmails).toBeUndefined();
  event(data);queueStaffEmail(data,previous,'coding-in-color');queueStaffEmail(data,previous,'coding-in-color');
  expect(data.staffEmails).toHaveLength(1);const job=data.staffEmails![0];
  expect(job.text).toContain('A new client was registered.');
  for(const privateValue of [data.clients[0].name,data.clients[0].email,data.visits[0].notes,'Private actor'])expect(job.text).not.toContain(privateValue);
  expect(await deliverStaffEmail(data,'coding-in-color')).toBe(true);
  expect(job).toMatchObject({state:'accepted',providerId:'email-provider-id'});
  const [url,request]=provider.mock.calls[0];expect(url).toBe('https://api.resend.com/emails');
  expect(request.headers['Idempotency-Key']).toBe(`staff-alert/${job.id}`);
  expect(JSON.parse(request.body)).toMatchObject({from:'alerts@example.org',to:['staff@example.org']});
  await deliverStaffEmail(data,'coding-in-color');expect(provider).toHaveBeenCalledTimes(1);
});

it('commits client activity before sending and does not send on failed writes',async()=>{
  await readDemoData();
  await expect(mutateDemoData(data=>{event(data);throw new Error('Invalid input');})).rejects.toThrow();
  expect(provider).not.toHaveBeenCalled();
  provider.mockImplementation(async()=>{const saved=await readDemoData();expect(saved.staffEmails![0].state).toBe('pending');return Response.json({id:'accepted-id'});});
  await mutateDemoData(data=>event(data,'visit.create'));
  expect((await readDemoData()).staffEmails![0].state).toBe('accepted');
});

it('preserves records on provider failure, backs off, and retries with the same key',async()=>{
  provider.mockResolvedValue(Response.json({error:'unavailable'},{status:503}));
  await mutateDemoData(data=>event(data));
  const data=await readDemoData(),job=data.staffEmails![0],key=provider.mock.calls[0][1].headers['Idempotency-Key'];
  expect(job.state).toBe('pending');expect(job.attempts).toBe(1);
  expect(await deliverStaffEmail(data,'coding-in-color',job.nextAttemptAt-1)).toBe(false);
  provider.mockResolvedValue(Response.json({id:'retry-id'}));
  await deliverStaffEmail(data,'coding-in-color',job.nextAttemptAt);
  expect(provider.mock.calls[1][1].headers['Idempotency-Key']).toBe(key);expect(job.state).toBe('accepted');
});

it('stops on permanent failure, expired retry window and removed recipients',async()=>{
  const data=await readDemoData();event(data);queueStaffEmail(data,new Set(),'coding-in-color');const job=data.staffEmails![0];
  provider.mockResolvedValue(Response.json({error:'invalid sender'},{status:403}));await deliverStaffEmail(data,'coding-in-color');expect(job.state).toBe('failed');
  job.state='pending';job.at=new Date(Date.now()-24*3600000).toISOString();provider.mockClear();await deliverStaffEmail(data,'coding-in-color');expect(job.state).toBe('failed');expect(provider).not.toHaveBeenCalled();
  job.state='pending';job.at=new Date().toISOString();vi.stubEnv('STAFF_EMAIL_RECIPIENTS','different@example.org');await deliverStaffEmail(data,'coding-in-color');expect(job.state).toBe('failed');expect(provider).not.toHaveBeenCalled();
});

it('requires an explicit server secret for retry scheduling and never uses browser tenant input',async()=>{
  expect((await POST(new Request('http://localhost/api/reports/staff-email-retry',{method:'POST'}))).status).toBe(401);
  const request=()=>new Request('http://localhost/api/reports/staff-email-retry',{method:'POST',headers:{authorization:`Bearer ${process.env.STAFF_EMAIL_CRON_SECRET}`}});
  vi.stubEnv('STAFF_EMAIL_ENABLED','false');expect((await POST(request())).status).toBe(503);
  vi.stubEnv('STAFF_EMAIL_ENABLED','true');expect((await POST(request())).status).toBe(200);expect(provider).not.toHaveBeenCalled();
});

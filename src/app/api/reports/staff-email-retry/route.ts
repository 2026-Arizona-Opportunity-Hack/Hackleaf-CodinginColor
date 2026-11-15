import { createHash,timingSafeEqual } from 'node:crypto';
import { mutateDemoData } from '@/features/case-management/store';
import { emailOrganization,staffEmailConfig } from '@/features/reports/staff-email';
import { isDemoWorkspace } from '@/lib/workspace';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  const headers={'Cache-Control':'no-store'},secret=process.env.STAFF_EMAIL_CRON_SECRET??'';
  const provided=request.headers.get('authorization')??'';
  const hash=(s:string)=>createHash('sha256').update(s).digest();
  if(secret.length<32||!timingSafeEqual(hash(provided),hash(`Bearer ${secret}`)))return Response.json({error:'Unauthorized'},{status:401,headers});
  if(!isDemoWorkspace()||!staffEmailConfig())return Response.json({error:'Staff email is not configured for this workspace.'},{status:503,headers});
  await mutateDemoData(()=>null,emailOrganization());
  return Response.json({message:'Processed one eligible queued email, if any.'},{headers});
}

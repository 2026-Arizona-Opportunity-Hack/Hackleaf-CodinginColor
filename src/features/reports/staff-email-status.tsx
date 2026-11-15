import { currentTenant } from '@/features/client-p2/tenant-server';
import { staffEmailStatus } from './staff-email';
import type { DemoData } from '@/features/case-management/model';
export async function StaffEmailStatus({data}:{data:DemoData}) {
  const status=staffEmailStatus(data,await currentTenant());
  return <section aria-label="Automatic staff email" style={{padding:'18px 22px',border:'1px solid #cce4d4',borderRadius:12,marginTop:18,background:'#f4faf6'}}>
    <h2 style={{fontSize:18,color:'#007a3d'}}>Automatic staff email</h2>
    <p style={{fontSize:13,marginTop:8}}>{status.configured?'On — new clients, service logs and appointment changes trigger an aggregate update to configured staff inboxes.':'Off — sender, staff recipients and Resend credentials must be configured before real emails can leave this app.'}</p>
    <p style={{fontSize:12,marginTop:8}}>Recent email history: {status.accepted} accepted by email provider · {status.pending} queued · {status.failed} need attention. Provider acceptance does not confirm inbox delivery.</p>
    {!!status.pending&&<p style={{fontSize:12,marginTop:8}}>Pending emails retry on the next saved activity or configured retry schedule.</p>}
    {!!status.failed&&<p role="status" style={{fontSize:12,marginTop:8}}>Ask the project owner to check Resend delivery history and sender settings. Failed emails are not automatically re-sent.</p>}
  </section>;
}

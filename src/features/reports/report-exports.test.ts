import { beforeEach,it,expect,vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
vi.mock('server-only',()=>({}));
const mock=vi.hoisted(()=>({user:{id:'staff'} as {id:string}|null,data:{clients:[],visits:[],fields:[],serviceTypes:[]}}));
vi.mock('@/features/demo-auth/session',()=>({getDemoUser:async()=>mock.user}));
vi.mock('@/features/case-management/store',()=>({readDemoData:async()=>mock.data}));
vi.mock('@/features/client-p2/tenant-server',()=>({currentTenant:async()=> 'coding-in-color'}));
import { GET } from '@/app/api/client-funder-report/route';
import { funderPdf } from './funder-pdf';
import { reportingMonths,monthYear } from './report-period';
beforeEach(()=>{mock.user={id:'staff'};});
it('selects whole months, respects leap years and caps the current month at today',()=>{
  expect(reportingMonths('2024-02','2024-02','2026-11-15')).toEqual({start:'2024-02-01',end:'2024-02-29'});
  expect(reportingMonths('2026-10','2026-11','2026-11-15')).toEqual({start:'2026-10-01',end:'2026-11-15'});
  expect(monthYear('2026-11-15')).toBe('November 2026');
  for(const [start,end] of [['2026-12','2026-12'],['2026-11','2026-10'],['2026-13','2026-13']])expect(()=>reportingMonths(start,end,'2026-11-15')).toThrow();
});
it('returns an authenticated real PDF attachment rather than an HTML Word document',async()=>{
  const url='http://localhost/api/client-funder-report?start=2026-01-01&end=2026-01-31';
  mock.user=null;expect((await GET(new Request(url))).status).toBe(401);mock.user={id:'staff'};
  const response=await GET(new Request(url));expect(response.headers.get('content-type')).toBe('application/pdf');
  expect(response.headers.get('content-disposition')).toContain('.pdf');expect(response.headers.get('cache-control')).toContain('no-store');
  const bytes=new Uint8Array(await response.arrayBuffer());expect(new TextDecoder().decode(bytes.slice(0,5))).toBe('%PDF-');
  const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeGreaterThan(0);expect(pdf.getTitle()).toContain('Funder service report');
});
it('paginates long configured fields and embeds accented text in a valid PDF',async()=>{
  const bytes=await funderPdf({start:'2026-01-01',end:'2026-01-31',clients:3,services:4,types:[],demographics:Array.from({length:20},(_,i)=>({label:`Préférences ${i}`,values:Array.from({length:8},()=>({label:'Español — activité de soutien',count:3}))}))},'Coding in Color');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(2);
});

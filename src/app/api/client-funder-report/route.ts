import { funderPdf } from "@/features/reports/funder-pdf";
import { getDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { funderReport } from "@/features/client-p2/funder";
import { currentTenant } from "@/features/client-p2/tenant-server";
import { organizations } from "@/features/client-p2/tenants";
import { z } from "zod";
export async function GET(request:Request){if(!await getDemoUser())return new Response(null,{status:401});try{const p=new URL(request.url).searchParams,start=z.iso.date().parse(p.get("start")),end=z.iso.date().parse(p.get("end"));if(start>end||end>today())throw new Error();const tenant=await currentTenant(),org=organizations.find(o=>o.id===tenant)!;return new Response(Buffer.from(await funderPdf(funderReport(await readDemoData(),start,end),org.name)),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="funder-service-report.pdf"',"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"Choose valid dates ending today or earlier."},{status:400});}}

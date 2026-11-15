import { NextRequest,NextResponse } from "next/server";
import { getDemoUser } from "@/features/demo-auth/session";
import { isDemoWorkspace } from "@/lib/workspace";
import { readDemoData } from "@/features/case-management/store";
import { clientsCsv,servicesCsv } from "@/features/case-management/csv";
export async function GET(request:NextRequest){
  const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
  if(!isDemoWorkspace())return NextResponse.json({error:"Demo export is not available in live mode."},{status:404,headers});
  const user=await getDemoUser();if(!user)return NextResponse.json({error:"unauthorized"},{status:401,headers});if(user.role!=="admin")return NextResponse.json({error:"Admin access is required."},{status:403,headers});
  const kind=request.nextUrl.searchParams.get("kind")??"clients";
  if(!["clients","services","template","schema"].includes(kind))return NextResponse.json({error:"Unknown export type."},{status:400,headers});
  const data=await readDemoData(),body=kind==="schema"?JSON.stringify(data.schemas,null,2):kind==="services"?servicesCsv(data):clientsCsv(data,kind==="template");
  return new Response(body,{headers:{...headers,"Content-Type":kind==="schema"?"application/json; charset=utf-8":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${kind}-demo.${kind==="schema"?"json":"csv"}"`}});
}

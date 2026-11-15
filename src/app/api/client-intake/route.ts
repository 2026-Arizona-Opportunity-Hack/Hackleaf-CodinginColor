import { sameOrigin } from "@/features/client-p2/request-origin";
import { limitedForm } from "@/features/client-p2/request-body";
import { getDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { documentType } from "@/features/client-p2/documents";
import { extractIntake,imageDimensions } from "@/features/client-p2/intake";
import { recognizeIntake } from "@/features/client-p2/ocr";
export const runtime="nodejs";
export async function POST(request:Request){if(!await getDemoUser())return new Response(null,{status:401});if(!sameOrigin(request))return new Response(null,{status:403});if(Number(request.headers.get('content-length'))>2200000)return Response.json({error:'Choose an image under 2 MB.'},{status:413});try{const f=(await limitedForm(request,2200000)).get('image');if(!(f instanceof File)||!f.size||f.size>2000000)throw new Error('Choose an image under 2 MB.');const bytes=new Uint8Array(await f.arrayBuffer()),type=documentType(bytes);if(type==='application/pdf')throw new Error('Use a PNG or JPEG photo, not PDF.');const size=imageDimensions(bytes,type);if(!size.width||!size.height||size.width*size.height>12000000)throw new Error('Use an image up to 12 megapixels.');const result=await recognizeIntake(bytes),data=await readDemoData();return Response.json({...result,draft:extractIntake(result.text,data.fields)},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return Response.json({error:error instanceof Error?error.message:'Could not read image. Try a clearer photo.'},{status:400});}}

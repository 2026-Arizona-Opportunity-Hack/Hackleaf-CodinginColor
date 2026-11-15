import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { MAX_DOCUMENT } from "./documents";
export const uploadMetadata=z.object({clientId:z.uuid(),name:z.string().min(1).max(200),size:z.number().int().min(1).max(MAX_DOCUMENT),type:z.enum(["application/pdf","image/png","image/jpeg"])}).strict();
const intentSchema=uploadMetadata.extend({id:z.uuid(),createdBy:z.uuid(),expires:z.number().int()}).strict();
type Intent=z.infer<typeof intentSchema>;
function signature(value:string){const secret=process.env.AI_ACTION_SECRET?.trim();if(!secret||secret.length<32)throw new Error("Private upload signing is not configured.");return createHmac("sha256",secret).update("case-document:"+value).digest();}
export function signUpload(intent:Intent){const value=Buffer.from(JSON.stringify(intentSchema.parse(intent))).toString("base64url");return value+"."+signature(value).toString("base64url");}
export function verifyUpload(token:string,actorId:string){
 if(token.length>4000)throw new Error("Invalid upload intent.");const [value,mac,...extra]=token.split(".");if(!value||!mac||extra.length)throw new Error("Invalid upload intent.");const expected=signature(value),actual=Buffer.from(mac,"base64url");if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error("Invalid upload intent.");
 const intent=intentSchema.parse(JSON.parse(Buffer.from(value,"base64url").toString("utf8")));if(intent.createdBy!==actorId||intent.expires<Date.now())throw new Error("Upload intent expired or belongs to another account.");return intent;
}

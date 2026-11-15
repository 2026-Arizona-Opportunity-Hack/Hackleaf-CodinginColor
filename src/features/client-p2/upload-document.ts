"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
// Upload bytes directly to private Supabase Storage so a 5 MB document does not
// exceed Vercel's smaller function request-body limit. Finalization verifies bytes.
export async function uploadClientDocument(form:FormData,live:boolean){
 if(!live)return fetch("/api/client-documents",{method:"POST",body:form});
 const file=form.get("file");if(!(file instanceof File)||!file.size||file.size>5*1024*1024)throw new Error("Choose a nonempty document up to 5 MB.");
 const prepared=await fetch("/api/client-documents/upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:form.get("clientId"),name:file.name,size:file.size,type:file.type})});
 if(!prepared.ok)return prepared;
 const intent=await prepared.json(),db=createSupabaseBrowserClient();
 const {error}=await db.storage.from("case-documents").uploadToSignedUrl(intent.path,intent.token,file,{contentType:file.type});
 if(error)throw new Error("Private upload failed. Check your connection and retry.");
 return fetch("/api/client-documents/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:intent.intent})});
}

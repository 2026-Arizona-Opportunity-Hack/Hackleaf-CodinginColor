import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isDemoWorkspace } from "@/lib/workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoDirectory } from "@/features/case-management/store";
import type { ClientDocument } from "./documents";
const bucket = "case-documents";
const key = (doc: Pick<ClientDocument,"id"|"createdBy">) => `coding-in-color/${doc.createdBy}/${doc.id}`;
export async function saveDocumentFile(doc: Pick<ClientDocument,"id"|"createdBy"|"type">, bytes: Uint8Array) {
  if (isDemoWorkspace()) {
    const dir=join(await demoDirectory(),"documents"); await mkdir(dir,{recursive:true,mode:0o700});
    await writeFile(join(dir,doc.id),bytes,{mode:0o600}); return;
  }
  const db=await createSupabaseServerClient();
  const {error}=await db.storage.from(bucket).upload(key(doc),bytes,{contentType:doc.type,upsert:false});
  if(error)throw new Error("Private document upload failed. Check the storage migration and staff permissions.");
}
export async function readDocumentFile(doc: ClientDocument) {
  if(isDemoWorkspace())return readFile(join(await demoDirectory(),"documents",doc.id));
  const db=await createSupabaseServerClient(); const {data,error}=await db.storage.from(bucket).download(key(doc));
  if(error||!data)throw new Error("Private document is unavailable.");
  return Buffer.from(await data.arrayBuffer());
}
export async function removeDocumentFile(doc: Pick<ClientDocument,"id"|"createdBy">) {
  if(isDemoWorkspace()){await rm(join(await demoDirectory(),"documents",doc.id),{force:true});return;}
  const db=await createSupabaseServerClient();const {error}=await db.storage.from(bucket).remove([key(doc)]);
  if(error)throw new Error("The private file could not be removed. An administrator must retry cleanup.");
}

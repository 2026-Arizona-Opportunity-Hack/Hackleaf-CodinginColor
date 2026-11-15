import "server-only";
import { currentTenant } from "@/features/client-p2/tenant-server";
import { tenantId } from "@/features/client-p2/tenants";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { upgradeDemoData } from "./upgrade";
import { DEMO_ACCOUNTS, today, type DemoData } from "./model";
import { queueStaffEmail,deliverStaffEmail } from "@/features/reports/staff-email";
const scrypt=promisify(scryptCallback);
export async function passwordHash(password:string,salt:string) { return (await scrypt(password,salt,64) as Buffer).toString("hex"); }
export async function verifyPassword(password:string,user:{salt:string;passwordHash:string}) {
  const actual=Buffer.from(await passwordHash(password,user.salt),"hex"),expected=Buffer.from(user.passwordHash,"hex");
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
// Runtime-generated demo data must not be traced or packaged in the build.
export async function demoDirectory(organization?:string){
  const id=tenantId(organization??await currentTenant());
  const root=resolve(/*turbopackIgnore: true*/ process.env.DEMO_DATA_DIR || join(process.cwd(),".demo-data"));
  return id==="coding-in-color"?root:join(/*turbopackIgnore: true*/ root,"organizations",id);
}
async function seed():Promise<DemoData> {
  const users=await Promise.all((["admin","staff"] as const).map(async role=>{const salt=randomBytes(16).toString("hex");return { id:randomUUID(),name:role==="admin"?"Demo Administrator":"Demo Staff",email:DEMO_ACCOUNTS[role].email,role,salt,passwordHash:await passwordHash(DEMO_ACCOUNTS[role].password,salt),active:true };}));
  const fields:DemoData["fields"]=[{id:"gender",label:"Gender",type:"select",options:["Woman","Man","Nonbinary","Prefer not to say"],active:true},{id:"language",label:"Preferred language",type:"select",options:["English","Spanish","Other"],active:true},{id:"household_size",label:"Household size",type:"number",options:[],active:true},{id:"support_goal",label:"Support goal",type:"text",options:[],active:true}];
  const serviceTypes=[{id:"intake",label:"Intake assessment",active:true},{id:"resource",label:"Resource support",active:true},{id:"follow_up",label:"Follow-up visit",active:true}];
  const names=["Alex Demo","Blair Demo","Casey Demo","Drew Demo","Emery Demo","Finley Demo","Gray Demo","Harper Demo","Indigo Demo","Jordan Demo","Kai Demo","Lane Demo"];
  const clients=names.map((name,i)=>({id:randomUUID(),name,dateOfBirth:`${1980+i}-04-${String(i+1).padStart(2,"0")}`,email:`client${i+1}@example.org`,phone:`202-555-${String(100+i).padStart(4,"0")}`,demographics:{gender:"Prefer not to say",language:i%2?"Spanish":"English",household_size:String(i%5+1),support_goal:"Fictional demonstration record"},revision:1,createdAt:new Date().toISOString()}));
  const visits=clients.flatMap((client,i)=>serviceTypes.map((type,j)=>{const date=new Date(`${today()}T12:00:00-07:00`);date.setUTCDate(date.getUTCDate()-(2-j)*7-i);return {id:randomUUID(),clientId:client.id,date:date.toISOString().slice(0,10),serviceTypeId:type.id,serviceTypeLabel:type.label,staffId:users[1].id,staffName:users[1].name,notes:`Fictional ${type.label.toLowerCase()} for demonstration only.`,revision:1,createdAt:date.toISOString()};}));
  return upgradeDemoData({version:1,users,sessions:[],clients,visits,fields,serviceTypes,settingsRevision:1} as unknown as DemoData);
}
async function load(dir:string,allowUpgrade=false):Promise<DemoData> {
  const raw=await readFile(join(dir,"workspace.json"),"utf8");
  let data:DemoData;
  try{data=JSON.parse(raw) as DemoData;}catch{throw new Error("The demo data file is invalid. Restore the file before continuing.");}
  if(![1,2].includes(data.version) || !Array.isArray(data.users) || !Array.isArray(data.clients) || !Array.isArray(data.visits)) throw new Error("The demo data file is invalid. Restore the file before continuing.");
  if(Number(data.version)===1){if(!allowUpgrade)throw Object.assign(new Error("Upgrade required"),{code:"EUPGRADE"});return upgradeDemoData(data);}
  if(!Array.isArray(data.appointments)||!Array.isArray(data.audit)||!Array.isArray(data.serviceFields)||!data.schemas)throw new Error("The demo data file is invalid. Restore the file before continuing.");
  return data;
}
export async function readDemoData(organization?:string):Promise<DemoData> {
  const dir=await demoDirectory(organization);
  try { return await load(dir); } catch(error) { if(!["ENOENT","EUPGRADE"].includes((error as NodeJS.ErrnoException).code??"")) throw error; }
  return mutateDemoData(data=>structuredClone(data),organization);
}
// A filesystem lock plus atomic rename keeps this single-instance demo's writes
// consistent across concurrent requests. This is not a production database.
export async function mutateDemoData<T>(operation:(data:DemoData)=>T|Promise<T>,organization?:string):Promise<T> {
  const org=organization??await currentTenant(),dir=await demoDirectory(org);await mkdir(dir,{recursive:true,mode:0o700});
  const lock=join(dir,"write.lock");let locked=false;
  for(let i=0;i<250;i++){try{await mkdir(lock,{mode:0o700});locked=true;break;}catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;await new Promise(resolve=>setTimeout(resolve,20));}}
  if(!locked)throw new Error("The demo is busy. Retry shortly.");
  let temporary:string|undefined;
  try {
    let data:DemoData;
    try{data=await load(dir,true);}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;data=await seed();}
    const previous=new Set(data.audit.map(event=>event.id));
    const result=await operation(data);
    queueStaffEmail(data,previous,org);
    temporary=join(dir,`.workspace-${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify(data),{mode:0o600});await rename(temporary,join(dir,"workspace.json"));
    // Record success must survive provider failures. The outbox already exists
    // on disk before any email leaves; retries reuse the same provider key.
    try { if(await deliverStaffEmail(data,org)) {
      temporary=join(dir,`.workspace-${randomUUID()}.tmp`);
      await writeFile(temporary,JSON.stringify(data),{mode:0o600});await rename(temporary,join(dir,"workspace.json"));
    } } catch { /* Saved outbox can be retried; never log provider secrets. */ }
    return result;
  } finally {if(temporary)await rm(temporary,{force:true});await rm(lock,{recursive:true,force:true});}
}

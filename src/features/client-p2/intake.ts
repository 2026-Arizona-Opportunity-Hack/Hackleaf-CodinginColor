import type { CustomField } from "@/features/case-management/model";
export function extractIntake(text:string,fields:CustomField[]){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const value=(labels:string[])=>{for(const label of labels){const line=lines.find(line=>line.toLowerCase().startsWith(label.toLowerCase()+":"));if(line)return line.slice(line.indexOf(":")+1).trim().slice(0,200);}return "";};
 const rawDate=value(["Date of birth","DOB","Birth date"]),dateOfBirth=/^\d{4}-\d{2}-\d{2}$/.test(rawDate)?rawDate:"";
 const demographics=Object.fromEntries(fields.filter(f=>f.active).map(f=>{let v=value([f.label,f.id.replaceAll('_',' ')]);if(f.type==='select')v=f.options.find(o=>o.toLowerCase()===v.toLowerCase())??"";if(f.type==='number'&&!/^\d{1,6}$/.test(v))v="";return [f.id,v];}));
 return {name:value(["Client name","Full name","Name"]),dateOfBirth,email:value(["Email","Email address"]),phone:value(["Phone","Phone number","Telephone"]),demographics};
}
export function imageDimensions(bytes:Uint8Array,type:string){if(type==='image/png'){if(bytes.length<24)throw new Error('Invalid image.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);return {width:view.getUint32(16),height:view.getUint32(20)};}
 let offset=2;while(offset+9<bytes.length){if(bytes[offset]!==255){offset++;continue;}const marker=bytes[offset+1];if(marker===216||marker===217){offset+=2;continue;}const length=(bytes[offset+2]<<8)+bytes[offset+3];if(length<2)break;if([192,193,194].includes(marker))return {height:(bytes[offset+5]<<8)+bytes[offset+6],width:(bytes[offset+7]<<8)+bytes[offset+8]};offset+=length+2;}throw new Error('Could not read image dimensions. Use a PNG or standard JPEG.');}

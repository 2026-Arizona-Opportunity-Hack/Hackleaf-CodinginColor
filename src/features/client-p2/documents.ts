export interface ClientDocument {id:string;clientId:string;name:string;type:string;size:number;createdAt:string;createdBy:string}
export const MAX_DOCUMENT=5*1024*1024;
export function documentType(bytes:Uint8Array){if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return "image/png";if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";if(new TextDecoder().decode(bytes.slice(0,5))==="%PDF-")return "application/pdf";throw new Error("Upload a PDF, PNG or JPEG file.");}
export function safeDocumentName(name:string){return name.replace(/[\\/\u0000-\u001f\u007f]/g,"_").slice(0,150)||"document";}

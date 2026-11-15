export const TENANT_COOKIE="hackleaf-organization";
export const organizations=[{id:"coding-in-color",name:"Coding in Color"},{id:"hope-aid",name:"HopeAid demo"}] as const;
export function tenantId(raw?:string){const value=raw??organizations[0].id;if(!organizations.some(o=>o.id===value))throw new Error("Unknown organization.");return value;}

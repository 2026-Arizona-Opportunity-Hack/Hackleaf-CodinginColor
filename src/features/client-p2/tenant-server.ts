import "server-only";
import { cookies } from "next/headers";
import { tenantId,TENANT_COOKIE } from "./tenants";
export async function currentTenant(){let raw:string|undefined;try{raw=(await cookies()).get(TENANT_COOKIE)?.value;}catch{/* Unit tests outside a request use the default organization. */}return tenantId(raw);}

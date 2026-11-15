import { expect,it } from "vitest";
import { safePath } from "./contracts";
it("supports every live workspace page without allowing external or arbitrary navigation",()=>{
 for(const path of ["/dashboard","/clients","/clients/new","/clients/00000000-0000-4000-8000-000000000001","/appointments","/client-reports","/client-funder-reports","/client-intake","/client-settings","/client-data","/client-integrations","/audit","/admin/members"])expect(safePath(path,"staff")).toBe(path);
 for(const path of ["https://example.com","//example.com","/api/clients/export","/clients/../api/secrets","/unknown"])expect(safePath(path,"staff")).toBeNull();
 expect(safePath("/dashboard","donor")).toBeNull();
});

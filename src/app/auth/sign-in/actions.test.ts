import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({demo:vi.fn(),signIn:vi.fn(),signOut:vi.fn(),redirect:vi.fn(),revalidate:vi.fn()}));
vi.mock("@/features/demo-auth/actions",()=>({signOutDemo:async()=>({error:""})}));
vi.mock("@/lib/workspace",()=>({isDemoWorkspace:mock.demo}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:async()=>({auth:{signInWithPassword:mock.signIn,signOut:mock.signOut}})}));
vi.mock("next/navigation",()=>({redirect:mock.redirect}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidate}));
import { signInStaff, signOutStaff } from "./actions";
const form=()=>{const f=new FormData();f.set("email","fictional@example.org");f.set("password","Fictional-password-123");return f;};
beforeEach(()=>{vi.resetAllMocks();mock.demo.mockReturnValue(false);mock.signIn.mockResolvedValue({error:null});mock.signOut.mockResolvedValue({error:null});mock.redirect.mockImplementation(()=>{throw new Error("redirect-dashboard");});});
it("invalidates the shell and redirects successful sign-in to the welcome dashboard",async()=>{
  await expect(signInStaff({error:""},form())).rejects.toThrow("redirect-dashboard");
  expect(mock.redirect).toHaveBeenCalledWith("/dashboard");expect(mock.revalidate).toHaveBeenCalledWith("/","layout");
});
it("does not redirect failed sign-in or invalid input",async()=>{
  mock.signIn.mockResolvedValue({error:new Error("invalid credentials")});
  expect((await signInStaff({error:""},form())).error).toMatch(/Unable/);
  await signInStaff({error:""},new FormData());expect(mock.signIn).toHaveBeenCalledTimes(1);expect(mock.redirect).not.toHaveBeenCalled();
});
it("signs out this session and clears cached layouts without revoking other devices",async()=>{
  expect(await signOutStaff()).toEqual({error:""});expect(mock.signOut).toHaveBeenCalledWith({scope:"local"});expect(mock.revalidate).toHaveBeenCalledWith("/","layout");
});
it("reports logout failure without pretending to clear the session",async()=>{
  mock.signOut.mockResolvedValue({error:new Error("offline")});expect((await signOutStaff()).error).toBeTruthy();expect(mock.revalidate).not.toHaveBeenCalled();
});

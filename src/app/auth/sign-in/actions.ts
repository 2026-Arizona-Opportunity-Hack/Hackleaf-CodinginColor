"use server";

import { revalidatePath } from "next/cache";
import { signOutDemo } from "@/features/demo-auth/actions";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";

const credentials = z.object({ email: z.string().trim().max(254).pipe(z.email()), password: z.string().min(1).max(1024) });
export async function signInStaff(_previous: { error: string }, form: FormData): Promise<{ error: string }> {
  if (isDemoWorkspace()) return { error: "Staff sign-in is available in live mode only." };
  const result = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!result.success) return { error: "Enter a valid email and password." };
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(result.data);
    if (error) return { error: "Unable to sign in. Check your email and password, or ask the project owner to confirm your account." };
  } catch { return { error: "Supabase sign-in is unavailable. Check the project configuration and try again." }; }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutStaff(): Promise<{ error: string }> {
  if (isDemoWorkspace()) return signOutDemo();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Sign-out failed. Please try again." };
    revalidatePath("/", "layout");
    return { error: "" };
  } catch { return { error: "Sign-out is unavailable. Please try again." }; }
}

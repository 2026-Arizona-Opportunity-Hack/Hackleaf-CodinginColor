"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";

const registration = z.object({
  displayName: z.string().trim().min(1).max(200),
  email: z.string().trim().max(254).pipe(z.email()),
  password: z.string().min(8).max(1024),
  confirmPassword: z.string().min(8).max(1024),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords must match.", path: ["confirmPassword"] });

export async function registerStaff(_previous: { error: string; message: string }, form: FormData): Promise<{ error: string; message: string }> {
  if (isDemoWorkspace()) return { error: "Staff registration requires live mode.", message: "" };
  const result = registration.safeParse({ displayName: form.get("displayName"), email: form.get("email"), password: form.get("password"), confirmPassword: form.get("confirmPassword") });
  if (!result.success) return { error: "Enter your name, a valid email and matching passwords of at least 8 characters.", message: "" };
  try {
    const supabase = await createSupabaseServerClient();
    // Server Actions validate the Origin against this app's Host. No user-supplied
    // redirect/role is accepted. Only a display name goes into editable metadata.
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signUp({ email: result.data.email, password: result.data.password,
      options: { data: { display_name: result.data.displayName }, ...(origin ? { emailRedirectTo: new URL("/auth/callback", origin).toString() } : {}) },
    });
    if (error) return { error: error.code === "signup_disabled" ? "Registration is disabled for this project. Ask the project owner to enable staff account registration." : "Registration could not be completed. Check your details, try signing in if you already registered, or ask the project owner.", message: "" };
    return { error: "", message: data.session ? "Your login is registered. Staff access is pending project-owner approval." : "Check your email to confirm registration if required, then sign in. Staff access also requires project-owner approval." };
  } catch { return { error: "Supabase registration is unavailable. Please try again later.", message: "" }; }
}

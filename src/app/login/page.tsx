import { LoginForm } from "@/features/auth/login-form";
import { isDemoWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (isDemoWorkspace()) redirect("/");
  return <LoginForm />;
}

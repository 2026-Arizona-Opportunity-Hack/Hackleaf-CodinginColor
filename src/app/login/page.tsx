import { redirect } from "next/navigation";
import { isDemoWorkspace } from "@/lib/workspace";
import { LoginForm } from "@/features/auth/login-form";
export const metadata = { title: "Sign in" };
export default function LoginPage(){if(isDemoWorkspace())redirect("/auth/sign-in");return <LoginForm/>;}

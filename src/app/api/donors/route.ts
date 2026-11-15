import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";

export async function POST(request: NextRequest) {
  if (isDemoWorkspace()) {
    return NextResponse.json({ error: "demo_mode" }, { status: 503 });
  }

  let body: { name?: string; email?: string; phone?: string; dateOfBirth?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, email, phone, dateOfBirth, kind } = body;
  const KINDS = ["individual", "foundation", "company"];

  if (!name?.trim() || name.trim().length > 200) {
    return NextResponse.json({ error: "name is required (max 200 chars)." }, { status: 400 });
  }
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "kind must be individual, foundation, or company." }, { status: 400 });
  }
  if (email && email.length > 254) {
    return NextResponse.json({ error: "email is too long." }, { status: 400 });
  }
  if (phone && (phone.length < 7 || phone.length > 20)) {
    return NextResponse.json({ error: "phone must be 7–20 characters." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Assign owner = current user's member record
  const { data: member } = await supabase.from("members").select("id").eq("id", user.id).single();
  if (!member) {
    return NextResponse.json({ error: "Your account is not provisioned as a staff member." }, { status: 403 });
  }

  const { data, error } = await supabase.from("donors").insert({
    name: name.trim(),
    kind,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    date_of_birth: dateOfBirth || null,
    owner_id: user.id,
  }).select("id, name, kind, email, phone, date_of_birth, owner_id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(data, { status: 201, headers: { "Cache-Control": "no-store" } });
}

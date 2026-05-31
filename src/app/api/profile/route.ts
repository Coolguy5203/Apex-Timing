import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driver_name } = await req.json();
  const trimmed = driver_name?.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 32) {
    return NextResponse.json({ error: "Name must be 2–32 characters" }, { status: 400 });
  }

  // Check uniqueness (case-insensitive, exclude self)
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("driver_name", trimmed)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "That driver name is already taken" }, { status: 409 });

  const { error } = await supabase
    .from("users")
    .update({ driver_name: trimmed })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

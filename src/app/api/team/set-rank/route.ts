import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Admin-only: set your own team_rank to Race Director (2)
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can use this
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, team_rank")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("users")
    .update({ team_rank: 2 })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

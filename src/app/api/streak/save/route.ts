import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch shield count
  const { data: profile } = await supabase
    .from("users")
    .select("streak_shield_count")
    .eq("id", user.id)
    .single();

  if (!profile || profile.streak_shield_count < 1) {
    return NextResponse.json({ error: "No shields available" }, { status: 400 });
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Check not already saved
  const { data: existing } = await supabase
    .from("streak_saves")
    .select("id")
    .eq("user_id", user.id)
    .eq("saved_date", yesterday)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already saved for that day" }, { status: 400 });
  }

  // Insert the save + decrement shields atomically
  const [saveRes] = await Promise.all([
    supabase.from("streak_saves").insert({ user_id: user.id, saved_date: yesterday }),
    supabase.from("users").update({ streak_shield_count: profile.streak_shield_count - 1 }).eq("id", user.id),
  ]);

  if (saveRes.error) {
    return NextResponse.json({ error: saveRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, shields_remaining: profile.streak_shield_count - 1 });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/team/invite — generate (or return existing) invite code for current user's team
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("team_name")
    .eq("id", user.id)
    .single();

  if (!profile?.team_name) {
    return NextResponse.json({ error: "You don't have a team yet" }, { status: 400 });
  }

  // Delete all old codes for this team before generating a fresh one
  // (prevents stale codes from accumulating and remaining valid)
  await supabase
    .from("team_invites")
    .delete()
    .eq("team_name", profile.team_name);

  // Generate a unique code
  let invite_code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: clash } = await supabase
      .from("team_invites")
      .select("id")
      .eq("invite_code", invite_code)
      .maybeSingle();
    if (!clash) break;
    invite_code = generateCode();
    attempts++;
  }

  const { error } = await supabase.from("team_invites").insert({
    team_name: profile.team_name,
    invite_code,
    created_by: user.id,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invite_code });
}

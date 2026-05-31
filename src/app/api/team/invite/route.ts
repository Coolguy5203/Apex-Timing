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

  // Check if invite already exists for this team
  const { data: existing } = await supabase
    .from("team_invites")
    .select("invite_code")
    .eq("team_name", profile.team_name)
    .single();

  if (existing) {
    return NextResponse.json({ invite_code: existing.invite_code });
  }

  // Generate a unique code
  let invite_code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: clash } = await supabase
      .from("team_invites")
      .select("id")
      .eq("invite_code", invite_code)
      .single();
    if (!clash) break;
    invite_code = generateCode();
    attempts++;
  }

  const { error } = await supabase.from("team_invites").insert({
    team_name: profile.team_name,
    invite_code,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invite_code });
}

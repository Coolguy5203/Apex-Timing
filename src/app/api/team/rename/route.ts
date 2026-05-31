import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { new_name } = await req.json();
  const trimmed = new_name?.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 32) {
    return NextResponse.json({ error: "Team name must be 2–32 characters" }, { status: 400 });
  }

  // Get current team name
  const { data: profile } = await supabase
    .from("users")
    .select("team_name")
    .eq("id", user.id)
    .single();
  if (!profile?.team_name) {
    return NextResponse.json({ error: "You are not in a team" }, { status: 400 });
  }
  const oldName = profile.team_name;

  // Don't allow renaming to the same name
  if (trimmed.toLowerCase() === oldName.toLowerCase()) {
    return NextResponse.json({ error: "That is already your team name" }, { status: 400 });
  }

  // Check the new name isn't taken by another team
  const { data: taken } = await supabase
    .from("users")
    .select("id")
    .ilike("team_name", trimmed)
    .neq("team_name", oldName)
    .limit(1)
    .maybeSingle();
  if (taken) return NextResponse.json({ error: "That team name is already taken" }, { status: 409 });

  // Update all team members
  const { error: membersErr } = await supabase
    .from("users")
    .update({ team_name: trimmed })
    .eq("team_name", oldName);
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 });

  // Update the invite code record if one exists
  await supabase
    .from("team_invites")
    .update({ team_name: trimmed })
    .eq("team_name", oldName);

  return NextResponse.json({ ok: true, team_name: trimmed });
}

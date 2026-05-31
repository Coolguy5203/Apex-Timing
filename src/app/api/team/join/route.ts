import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/team/join — join a team using an invite code
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  // Look up the invite
  const { data: invite } = await supabase
    .from("team_invites")
    .select("team_name")
    .eq("invite_code", code.trim().toUpperCase())
    .single();

  if (!invite) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

  // Update the user's team
  const { error } = await supabase
    .from("users")
    .update({ team_name: invite.team_name })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team_name: invite.team_name });
}

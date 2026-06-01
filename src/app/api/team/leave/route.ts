import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/team/leave — remove current user from their team
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if the user is a Race Director
  const { data: profile } = await supabase
    .from("users")
    .select("team_rank, team_name")
    .eq("id", user.id)
    .single();

  if (profile?.team_rank === 2) {
    // Count other members — if there are any, RD must transfer first
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("team_name", profile.team_name)
      .neq("id", user.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Transfer the Race Director role before leaving the team." },
        { status: 400 }
      );
    }
    // Solo RD (last member) — allowed to leave (dissolves team)
  }

  const { error } = await supabase
    .from("users")
    .update({ team_name: null, team_rank: 0 })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

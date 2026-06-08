import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RANKS, getRank } from "@/lib/ranks";

export async function POST(req: Request) {
  try {
    const { target_user_id, new_rank } = await req.json();
    if (!target_user_id || new_rank === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    // Get actor profile
    const { data: actor } = await supabase
      .from("users")
      .select("id, team_rank, team_name, is_admin")
      .eq("id", user.id)
      .single();

    if (!actor) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Get target profile
    const { data: target } = await supabase
      .from("users")
      .select("id, team_rank, team_name, driver_name, is_pro")
      .eq("id", target_user_id)
      .single();

    if (!target) return NextResponse.json({ error: "Target driver not found" }, { status: 404 });

    // Must be on same team
    if (!actor.team_name || actor.team_name !== target.team_name) {
      return NextResponse.json({ error: "Not on the same team" }, { status: 403 });
    }

    // Only RACE DIRECTOR (rank 2) or admin can manage ranks
    if (actor.team_rank < 2 && !actor.is_admin) {
      return NextResponse.json({ error: "Only the team RACE DIRECTOR can manage ranks" }, { status: 403 });
    }

    // Can't promote/demote yourself
    if (actor.id === target.id) {
      return NextResponse.json({ error: "You cannot change your own rank" }, { status: 400 });
    }

    // Validate new rank range
    const rankConfig = getRank(new_rank);
    if (new_rank < 0 || new_rank > 2) {
      return NextResponse.json({ error: "Invalid rank" }, { status: 400 });
    }

    // RD transfer: if promoting someone to RD (rank 2), demote the current RD first.
    // This bypasses the one-per-team slot limit since we're doing a hand-off.
    const isRDTransfer = new_rank === 2 && actor.team_rank === 2;

    if (!isRDTransfer && rankConfig.maxPerTeam !== null) {
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("team_name", actor.team_name)
        .eq("team_rank", new_rank);

      if ((count ?? 0) >= rankConfig.maxPerTeam!) {
        return NextResponse.json({
          error: `${rankConfig.name} slots are full (max ${rankConfig.maxPerTeam} per team)`,
        }, { status: 400 });
      }
    }

    // Apply rank change
    await supabase
      .from("users")
      .update({ team_rank: new_rank })
      .eq("id", target.id);

    // If this was an RD transfer, demote the outgoing RD (actor) to Member
    if (isRDTransfer) {
      await supabase
        .from("users")
        .update({ team_rank: 0 })
        .eq("id", actor.id);

      await supabase.from("notifications").insert({
        user_id: actor.id,
        type: "RANK_CHANGE",
        title: "Race Director role transferred",
        message: `You transferred the 🏁 Race Director role to ${target.driver_name}. Your rank is now Member.`,
        data: { rank: 0, rank_name: "MEMBER" },
      });
    }

    // RACE DIRECTOR gets PRO for free — granted directly, no code/redemption needed.
    if (rankConfig.grantsPro && new_rank > target.team_rank) {
      if (!target.is_pro) {
        await supabase.from("users").update({ is_pro: true }).eq("id", target.id);
      }
      await supabase.from("notifications").insert({
        user_id: target.id,
        type: "RANK_PROMOTION",
        title: `Promoted to ${rankConfig.name}`,
        message: `You've been promoted to ${rankConfig.name} ${rankConfig.insignia} — APEX TIMING PRO is now unlocked on your account, free of charge.`,
        data: { rank: new_rank, rank_name: rankConfig.name, pro_granted: true },
      });
    }

    // Notify on demotion too
    if (new_rank < target.team_rank) {
      await supabase.from("notifications").insert({
        user_id: target.id,
        type: "RANK_CHANGE",
        title: `Rank changed to ${rankConfig.name}`,
        message: `Your team rank has been updated to ${rankConfig.name}.`,
        data: { rank: new_rank, rank_name: rankConfig.name },
      });
    }

    return NextResponse.json({ success: true, new_rank, pro_granted: rankConfig.grantsPro && new_rank > target.team_rank });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

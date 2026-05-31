import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { challenge_id } = await req.json();
  if (!challenge_id) return NextResponse.json({ error: "challenge_id required" }, { status: 400 });

  // Fetch the challenge
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challenge_id)
    .single();

  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

  // Build lap query: best lap in the window on the right combo
  let query = supabase
    .from("lap_times")
    .select("driver_id, lap_time_ms, users(driver_name)")
    .gte("submitted_at", challenge.start_date)
    .lte("submitted_at", challenge.end_date + "T23:59:59Z")
    .eq("validation_status", "approved")
    .order("lap_time_ms", { ascending: true });

  if (challenge.car_id)    query = query.eq("car_id", challenge.car_id);
  if (challenge.track_id)  query = query.eq("track_id", challenge.track_id);
  if (challenge.car_class) query = query.eq("car_class", challenge.car_class);

  const { data: laps } = await query;

  if (!laps || laps.length === 0) {
    return NextResponse.json({ error: "No qualifying laps found in challenge window" }, { status: 404 });
  }

  // Best lap overall — already sorted ascending, find unique best per driver then take overall best
  const bestPerDriver = new Map<string, number>();
  for (const lap of laps) {
    const existing = bestPerDriver.get(lap.driver_id);
    if (!existing || lap.lap_time_ms < existing) {
      bestPerDriver.set(lap.driver_id, lap.lap_time_ms);
    }
  }

  // Winner = driver with best lap
  const winnerId = [...bestPerDriver.entries()].sort((a, b) => a[1] - b[1])[0][0];
  const winnerName = (laps.find(l => l.driver_id === winnerId)?.users as any)?.driver_name ?? "Unknown";

  // Award points via RPC
  const { error: rpcError } = await supabase.rpc("award_challenge_points", {
    p_user_id: winnerId,
    p_points: challenge.bonus_points,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  // Send notification to winner
  await supabase.from("notifications").insert({
    user_id: winnerId,
    type: "CHALLENGE_WIN",
    title: "Challenge Won! 🏆",
    message: `You won the "${challenge.name}" challenge and earned +${challenge.bonus_points} points!`,
    data: { challenge_id, points: challenge.bonus_points },
  });

  return NextResponse.json({ success: true, winner_id: winnerId, winner_name: winnerName, points_awarded: challenge.bonus_points });
}

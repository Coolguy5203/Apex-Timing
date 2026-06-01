import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/h2h/finalize
 * Body: { event_id: string }
 * Admin-only. Looks at each matchup, finds the best lap each driver posted
 * during the event window on the assigned combo, crowns a winner, awards points.
 */
export async function POST(req: Request) {
  try {
    const { event_id } = await req.json();
    if (!event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { data: event } = await supabase
      .from("h2h_events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.status === "completed") return NextResponse.json({ error: "Already finalized" }, { status: 400 });

    const { data: matchups } = await supabase
      .from("h2h_matchups")
      .select("*, driver_a:users!h2h_matchups_driver_a_id_fkey(driver_name), driver_b:users!h2h_matchups_driver_b_id_fkey(driver_name)")
      .eq("event_id", event_id)
      .eq("finalized", false);

    if (!matchups || matchups.length === 0) {
      return NextResponse.json({ error: "No matchups to finalize" }, { status: 400 });
    }

    const startTs = event.start_date + "T00:00:00Z";
    const endTs   = event.end_date   + "T23:59:59Z";

    let finalized = 0;

    for (const matchup of matchups) {
      if (!matchup.car_id || !matchup.track_id) continue;

      // Best lap for each driver on the assigned combo during the event window
      const [{ data: bestA }, { data: bestB }] = await Promise.all([
        supabase
          .from("lap_times")
          .select("lap_time_ms")
          .eq("driver_id", matchup.driver_a_id)
          .eq("car_id", matchup.car_id)
          .eq("track_id", matchup.track_id)
          .neq("validation_status", "flagged")
          .gte("submitted_at", startTs)
          .lte("submitted_at", endTs)
          .order("lap_time_ms", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("lap_times")
          .select("lap_time_ms")
          .eq("driver_id", matchup.driver_b_id)
          .eq("car_id", matchup.car_id)
          .eq("track_id", matchup.track_id)
          .neq("validation_status", "flagged")
          .gte("submitted_at", startTs)
          .lte("submitted_at", endTs)
          .order("lap_time_ms", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const msA = bestA?.lap_time_ms ?? null;
      const msB = bestB?.lap_time_ms ?? null;

      let winnerId: string | null = null;
      let loserId:  string | null = null;

      if (msA !== null && msB !== null) {
        if (msA < msB) { winnerId = matchup.driver_a_id; loserId = matchup.driver_b_id; }
        else if (msB < msA) { winnerId = matchup.driver_b_id; loserId = matchup.driver_a_id; }
        // exact tie: no winner
      } else if (msA !== null) {
        winnerId = matchup.driver_a_id; // B didn't show up
      } else if (msB !== null) {
        winnerId = matchup.driver_b_id; // A didn't show up
      }

      // Update matchup record
      await supabase.from("h2h_matchups").update({
        driver_a_ms: msA,
        driver_b_ms: msB,
        winner_id: winnerId,
        finalized: true,
      }).eq("id", matchup.id);

      // Track matchup participation for both drivers (win rate denominator)
      await Promise.all([
        supabase.rpc("increment_h2h_matchups", { p_user_id: matchup.driver_a_id }),
        supabase.rpc("increment_h2h_matchups", { p_user_id: matchup.driver_b_id }),
      ]);

      // Award points
      if (winnerId) {
        await supabase.rpc("increment_h2h_points", {
          p_user_id: winnerId,
          p_points: event.points_win,
          p_wins: 1,
        }).then(() => {});

        // Notify winner
        const winnerName = winnerId === matchup.driver_a_id
          ? (matchup.driver_a as any)?.driver_name
          : (matchup.driver_b as any)?.driver_name;
        const loserName = winnerId === matchup.driver_a_id
          ? (matchup.driver_b as any)?.driver_name
          : (matchup.driver_a as any)?.driver_name;

        await supabase.from("notifications").insert([
          {
            user_id: winnerId,
            type: "H2H_WIN",
            title: `You won your H2H matchup! +${event.points_win} pts`,
            message: `You beat ${loserName} in "${event.name}" and earned ${event.points_win} points.`,
            data: { event_id, points: event.points_win },
          },
          ...(loserId ? [{
            user_id: loserId,
            type: "H2H_LOSS",
            title: `H2H result: ${event.name}`,
            message: `${winnerName} posted a faster time and wins the matchup. Better luck next event!`,
            data: { event_id },
          }] : []),
        ]);
      }

      finalized++;
    }

    // Mark event completed
    await supabase.from("h2h_events").update({ status: "completed" }).eq("id", event_id);

    return NextResponse.json({ success: true, finalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

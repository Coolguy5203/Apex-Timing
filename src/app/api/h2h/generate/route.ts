import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeAllRatings, pairDrivers } from "@/lib/skillRating";

/**
 * POST /api/h2h/generate
 * Body: { event_id: string }
 * Admin-only. Computes skill ratings, pairs drivers, inserts matchups.
 */
export async function POST(req: Request) {
  try {
    const { event_id } = await req.json();
    if (!event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    // Fetch the event
    const { data: event } = await supabase
      .from("h2h_events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.status !== "pending") return NextResponse.json({ error: "Event already generated" }, { status: 400 });

    // Wipe any existing matchups for this event (re-generate)
    await supabase.from("h2h_matchups").delete().eq("event_id", event_id);

    // Compute ratings and pair
    const ratings = await computeAllRatings();
    if (ratings.length < 2) return NextResponse.json({ error: "Not enough drivers with lap data" }, { status: 400 });

    const pairs = pairDrivers(ratings);

    // For each pair, find a shared combo or fall back to the event default
    const { data: allLaps } = await supabase
      .from("lap_times")
      .select("driver_id, car_id, track_id")
      .eq("validation_status", "valid");

    // Build set of combos per driver
    const driverCombos = new Map<string, Set<string>>();
    for (const lap of allLaps || []) {
      if (!driverCombos.has(lap.driver_id)) driverCombos.set(lap.driver_id, new Set());
      driverCombos.get(lap.driver_id)!.add(`${lap.car_id}|${lap.track_id}`);
    }

    const matchups = pairs.map(([a, b]) => {
      const combosA = driverCombos.get(a.userId) ?? new Set<string>();
      const combosB = driverCombos.get(b.userId) ?? new Set<string>();

      // Find shared combos
      const shared = [...combosA].filter((k) => combosB.has(k));

      let carId: string | null = event.default_car_id ?? null;
      let trackId: string | null = event.default_track_id ?? null;

      if (shared.length > 0) {
        // Pick the combo with the most total entries (most contested)
        const [chosenCarId, chosenTrackId] = shared[0].split("|");
        carId = chosenCarId;
        trackId = chosenTrackId;
      }

      return {
        event_id,
        driver_a_id: a.userId,
        driver_b_id: b.userId,
        car_id: carId,
        track_id: trackId,
      };
    });

    const { error } = await supabase.from("h2h_matchups").insert(matchups);
    if (error) throw error;

    // Update event status to active
    await supabase.from("h2h_events").update({ status: "active" }).eq("id", event_id);

    // Notify all matched drivers
    const notifRows = pairs.flatMap(([a, b]) => [
      {
        user_id: a.userId,
        type: "H2H_MATCHED",
        title: "Head-to-Head matchup assigned!",
        message: `You've been matched against ${b.driverName} for the "${event.name}" event. Post your fastest lap to win ${event.points_win} points!`,
        data: { event_id, opponent: b.driverName },
      },
      {
        user_id: b.userId,
        type: "H2H_MATCHED",
        title: "Head-to-Head matchup assigned!",
        message: `You've been matched against ${a.driverName} for the "${event.name}" event. Post your fastest lap to win ${event.points_win} points!`,
        data: { event_id, opponent: a.driverName },
      },
    ]);
    await supabase.from("notifications").insert(notifRows);

    return NextResponse.json({ success: true, matchups_created: matchups.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

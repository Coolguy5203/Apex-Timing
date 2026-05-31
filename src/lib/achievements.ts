import { createClient } from "@/lib/supabase/server";

export const ACHIEVEMENT_TIERS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  bronze:    { color: "text-amber-600",  bg: "bg-amber-600/10",  border: "border-amber-600/30",  label: "BRONZE"    },
  silver:    { color: "text-gray-300",   bg: "bg-gray-300/10",   border: "border-gray-300/30",   label: "SILVER"    },
  gold:      { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "GOLD"      },
  legendary: { color: "text-neon-purple",bg: "bg-neon-purple/10",border: "border-neon-purple/30",label: "LEGENDARY" },
};

/** Check all achievements for a user and award any new ones. Returns keys of newly unlocked achievements. */
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const [existingRes, lapRes, profileRes] = await Promise.all([
    supabase.from("user_achievements").select("achievement_key").eq("user_id", userId),
    supabase.from("lap_times")
      .select("id, lap_time_ms, car_id, track_id, notes, submitted_at, sector_1_ms, sector_2_ms, sector_3_ms")
      .eq("driver_id", userId),
    supabase.from("users").select("team_name, h2h_wins").eq("id", userId).single(),
  ]);

  const unlocked = new Set((existingRes.data || []).map((a) => a.achievement_key));
  const laps = lapRes.data || [];
  const profile = profileRes.data;
  const newKeys: string[] = [];

  const maybe = (key: string, condition: boolean) => {
    if (condition && !unlocked.has(key)) newKeys.push(key);
  };

  // ── LAP COUNT MILESTONES ──────────────────────────────────────────────────
  maybe("FIRST_LAP",      laps.length >= 1);
  maybe("FIVE_LAPS",      laps.length >= 5);
  maybe("TEN_LAPS",       laps.length >= 10);
  maybe("TWENTY_FIVE_LAPS", laps.length >= 25);
  maybe("FIFTY_LAPS",     laps.length >= 50);
  maybe("HUNDRED_LAPS",   laps.length >= 100);
  maybe("DOUBLE_CENTURY", laps.length >= 200);
  maybe("TRIPLE_CENTURY", laps.length >= 300);

  // ── LAP TIME MILESTONES ───────────────────────────────────────────────────
  maybe("BEAT_THE_CLOCK", laps.some((l) => l.lap_time_ms < 60_000));
  maybe("SPEED_LEGEND",   laps.some((l) => l.lap_time_ms < 45_000));

  // ── UNIQUE CARS & TRACKS ──────────────────────────────────────────────────
  const uniqueCars   = new Set(laps.map((l) => l.car_id)).size;
  const uniqueTracks = new Set(laps.map((l) => l.track_id)).size;
  maybe("TWO_CARS",        uniqueCars   >= 2);
  maybe("MULTI_CAR",       uniqueCars   >= 5);
  maybe("TEN_CARS",        uniqueCars   >= 10);
  maybe("CAR_CONNOISSEUR", uniqueCars   >= 15);
  maybe("TWO_TRACKS",      uniqueTracks >= 2);
  maybe("FIVE_TRACKS",     uniqueTracks >= 5);
  maybe("GLOBE_TROTTER",   uniqueTracks >= 10);
  maybe("GLOBE_MASTER",    uniqueTracks >= 20);

  // ── CAR+TRACK COMBO COUNT ─────────────────────────────────────────────────
  const uniqueCombos = new Set(laps.map((l) => `${l.car_id}|${l.track_id}`)).size;
  maybe("COMBO_KING", uniqueCombos >= 15);

  // ── TEAM ──────────────────────────────────────────────────────────────────
  maybe("TEAM_PLAYER", !!profile?.team_name);

  // ── NOTES ─────────────────────────────────────────────────────────────────
  maybe("NOTES_TAKER", laps.some((l) => l.notes && l.notes.trim().length > 0));

  // ── SECTOR TIMES ──────────────────────────────────────────────────────────
  const lapsWithSectors = laps.filter((l) => l.sector_1_ms && l.sector_2_ms && l.sector_3_ms);
  maybe("SECTOR_SPECIALIST", lapsWithSectors.length >= 1);
  maybe("WITH_SECTORS",      lapsWithSectors.length >= 1);   // alias kept for old key
  maybe("SECTOR_PRO",        lapsWithSectors.length >= 10);

  // ── SUBMISSION TIME OF DAY ────────────────────────────────────────────────
  const lapHours = laps.map((l) => new Date(l.submitted_at).getHours());
  maybe("NIGHT_OWL",  lapHours.some((h) => h >= 0  && h < 5));
  maybe("EARLY_BIRD", lapHours.some((h) => h >= 4  && h < 7));

  // ── WEEKEND ───────────────────────────────────────────────────────────────
  maybe("WEEKEND_WARRIOR", laps.some((l) => {
    const day = new Date(l.submitted_at).getDay(); // 0=Sun, 6=Sat
    return day === 0 || day === 6;
  }));

  // ── ACTIVE DAYS ───────────────────────────────────────────────────────────
  const uniqueDays = new Set(laps.map((l) => l.submitted_at.slice(0, 10))).size;
  maybe("DAILY_GRINDER", uniqueDays >= 10);

  // ── MULTIPLE LAPS IN ONE DAY ──────────────────────────────────────────────
  const lapsByDay = new Map<string, number>();
  for (const l of laps) {
    const d = l.submitted_at.slice(0, 10);
    lapsByDay.set(d, (lapsByDay.get(d) ?? 0) + 1);
  }
  maybe("QUICK_SESSION", [...lapsByDay.values()].some((n) => n >= 3));

  // ── STREAK-BASED ──────────────────────────────────────────────────────────
  const { getStreakInfo } = await import("@/lib/supabase/queries");
  const streak = await getStreakInfo(userId);
  const bestStreak = Math.max(streak.current, streak.longest);
  maybe("THREE_STREAK",    bestStreak >= 3);
  maybe("FIVE_STREAK",     bestStreak >= 5);
  maybe("WEEK_STREAK",     bestStreak >= 7);
  maybe("TWO_WEEK_STREAK", bestStreak >= 14);
  maybe("IRON_WILL",       bestStreak >= 21);
  maybe("MONTH_STREAK",    bestStreak >= 30);
  maybe("IRON_MAN",        bestStreak >= 60);

  // ── H2H ──────────────────────────────────────────────────────────────────
  const h2hWins = profile?.h2h_wins ?? 0;
  // Check if driver has any H2H matchup (participated)
  if (!unlocked.has("FIRST_H2H") || !unlocked.has("H2H_WINNER") || !unlocked.has("H2H_VETERAN") || !unlocked.has("H2H_CHAMPION")) {
    const { data: matchups } = await supabase
      .from("h2h_matchups")
      .select("winner_id")
      .or(`driver_a_id.eq.${userId},driver_b_id.eq.${userId}`)
      .limit(1);
    maybe("FIRST_H2H",    (matchups?.length ?? 0) > 0);
    maybe("H2H_WINNER",   h2hWins >= 1);
    maybe("H2H_VETERAN",  h2hWins >= 3);
    maybe("H2H_CHAMPION", h2hWins >= 5);
  }

  // ── LEADERBOARD RANK ──────────────────────────────────────────────────────
  if (!unlocked.has("PODIUM") || !unlocked.has("POLE_POSITION") || !unlocked.has("CLEAN_SWEEP") || !unlocked.has("DOMINANT") || !unlocked.has("GRAND_MASTER")) {
    const pbMap = new Map<string, number>();
    for (const lap of [...laps].sort((a, b) => a.lap_time_ms - b.lap_time_ms)) {
      const k = `${lap.car_id}__${lap.track_id}`;
      if (!pbMap.has(k)) pbMap.set(k, lap.lap_time_ms);
    }

    // ── PB HUNTER — beat your own best 5 times ────────────────────────────
    if (!unlocked.has("PB_HUNTER")) {
      const comboPBs = new Map<string, number>();
      let pbBeats = 0;
      for (const lap of [...laps].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())) {
        const k = `${lap.car_id}__${lap.track_id}`;
        const prev = comboPBs.get(k);
        if (prev !== undefined && lap.lap_time_ms < prev) pbBeats++;
        if (prev === undefined || lap.lap_time_ms < prev) comboPBs.set(k, lap.lap_time_ms);
      }
      maybe("PB_HUNTER", pbBeats >= 5);
    }

    let p1Count = 0;
    for (const [key, myBest] of pbMap.entries()) {
      const [carId, trackId] = key.split("__");
      const { data: faster } = await supabase
        .from("lap_times")
        .select("driver_id")
        .eq("car_id", carId)
        .eq("track_id", trackId)
        .neq("validation_status", "flagged")
        .lt("lap_time_ms", myBest)
        .neq("driver_id", userId);
      const uniqueFaster = new Set((faster || []).map((r) => r.driver_id)).size;
      const rank = uniqueFaster + 1;
      if (rank <= 3) maybe("PODIUM", true);
      if (rank === 1) { maybe("POLE_POSITION", true); p1Count++; }
    }
    maybe("CLEAN_SWEEP",  p1Count >= 3);
    maybe("DOMINANT",     p1Count >= 5);
    maybe("GRAND_MASTER", p1Count >= 10);
  }

  if (newKeys.length === 0) return [];

  // Insert new achievements
  await supabase.from("user_achievements").insert(
    newKeys.map((key) => ({ user_id: userId, achievement_key: key }))
  );

  // Create in-app notifications
  const { data: achDefs } = await supabase
    .from("achievements")
    .select("key, name, icon, tier")
    .in("key", newKeys);

  if (achDefs && achDefs.length > 0) {
    await supabase.from("notifications").insert(
      achDefs.map((a) => ({
        user_id: userId,
        type: "ACHIEVEMENT_UNLOCKED",
        title: `Achievement Unlocked: ${a.name}`,
        message: `You earned the ${a.icon} ${a.name} badge (${a.tier.toUpperCase()})`,
        data: { achievement_key: a.key, tier: a.tier, icon: a.icon },
      }))
    );
  }

  return newKeys;
}

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
    supabase.from("lap_times").select("id, lap_time_ms, car_id, track_id, sector_1_ms, sector_2_ms, sector_3_ms").eq("driver_id", userId),
    supabase.from("users").select("team_name").eq("id", userId).single(),
  ]);

  const unlocked = new Set((existingRes.data || []).map((a) => a.achievement_key));
  const laps = lapRes.data || [];
  const profile = profileRes.data;
  const newKeys: string[] = [];

  const maybe = (key: string, condition: boolean) => {
    if (condition && !unlocked.has(key)) newKeys.push(key);
  };

  // Lap count milestones
  maybe("FIRST_LAP",    laps.length >= 1);
  maybe("TEN_LAPS",     laps.length >= 10);
  maybe("FIFTY_LAPS",   laps.length >= 50);
  maybe("HUNDRED_LAPS", laps.length >= 100);

  // Sub-60 second lap
  maybe("BEAT_THE_CLOCK", laps.some((l) => l.lap_time_ms < 60_000));

  // Unique cars / tracks
  const uniqueCars   = new Set(laps.map((l) => l.car_id)).size;
  const uniqueTracks = new Set(laps.map((l) => l.track_id)).size;
  maybe("MULTI_CAR",     uniqueCars   >= 5);
  maybe("GLOBE_TROTTER", uniqueTracks >= 10);

  // Team membership
  maybe("TEAM_PLAYER", !!profile?.team_name);

  // Sector specialist — lap with all 3 sectors
  maybe("SECTOR_SPECIALIST", laps.some((l) => l.sector_1_ms && l.sector_2_ms && l.sector_3_ms));

  // Streak-based
  const { getStreakInfo } = await import("@/lib/supabase/queries");
  const streak = await getStreakInfo(userId);
  maybe("WEEK_STREAK",  streak.current >= 7  || streak.longest >= 7);
  maybe("MONTH_STREAK", streak.current >= 30 || streak.longest >= 30);

  // Leaderboard rank — P1 / top-3 on any combo
  if (!unlocked.has("PODIUM") || !unlocked.has("POLE_POSITION") || !unlocked.has("CLEAN_SWEEP")) {
    // Best lap per combo
    const pbMap = new Map<string, number>();
    for (const lap of [...laps].sort((a, b) => a.lap_time_ms - b.lap_time_ms)) {
      const k = `${lap.car_id}__${lap.track_id}`;
      if (!pbMap.has(k)) pbMap.set(k, lap.lap_time_ms);
    }

    let p1Count = 0;
    for (const [key, myBest] of pbMap.entries()) {
      const [carId, trackId] = key.split("__");
      const { data: faster } = await supabase
        .from("lap_times")
        .select("driver_id")
        .eq("car_id", carId)
        .eq("track_id", trackId)
        .lt("lap_time_ms", myBest)
        .neq("driver_id", userId);
      const uniqueFaster = new Set((faster || []).map((r) => r.driver_id)).size;
      const rank = uniqueFaster + 1;
      if (rank <= 3) maybe("PODIUM", true);
      if (rank === 1) { maybe("POLE_POSITION", true); p1Count++; }
    }
    maybe("CLEAN_SWEEP", p1Count >= 3);
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

import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatGap } from "@/utils/lapTime";
import type { LeaderboardEntry, Car, Track } from "@/types";

export async function getCars(proOnly = false): Promise<Car[]> {
  const supabase = await createClient();
  let query = supabase.from("cars").select("*").order("name");
  if (!proOnly) query = query.eq("is_pro", false);
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching cars:", error);
    return [];
  }
  return data || [];
}

export async function getTracks(proOnly = false): Promise<Track[]> {
  const supabase = await createClient();
  let query = supabase.from("tracks").select("*").order("name");
  if (!proOnly) query = query.eq("is_pro", false);
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching tracks:", error);
    return [];
  }
  return data || [];
}
export async function getCarClasses(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cars").select("class").order("class");
  const classes = [...new Set((data || []).map((c) => c.class).filter(Boolean))];
  return classes;
}

export async function getLeaderboard(
  carId?: string,
  trackId?: string,
  carClass?: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("lap_times")
    .select(
      `
      id,
      driver_id,
      lap_time_ms,
      submitted_at,
      notes,
      validation_status,
      flag_reason,
      users!inner(driver_name, team_name),
      cars!inner(id, name, class),
      tracks!inner(id, name)
    `
    )
    .order("lap_time_ms", { ascending: true });

  if (carId) query = query.eq("car_id", carId);
  if (trackId) query = query.eq("track_id", trackId);
  if (carClass) query = query.eq("cars.class", carClass);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const seenDrivers = new Map<string, boolean>();
  const uniqueEntries: typeof data = [];

  for (const entry of data) {
    const key = `${entry.driver_id}-${(entry.cars as any).id}-${(entry.tracks as any).id}`;
    if (!seenDrivers.has(key)) {
      seenDrivers.set(key, true);
      uniqueEntries.push(entry);
    }
  }

  const fastestMs = uniqueEntries[0]?.lap_time_ms || 0;

  return uniqueEntries.map((entry, index) => ({
    rank: index + 1,
    driver_id: entry.driver_id,
    driver_name: (entry.users as any).driver_name,
    team_name: (entry.users as any).team_name,
    car_id: (entry.cars as any).id,
    car_name: (entry.cars as any).name,
    track_id: (entry.tracks as any).id,
    track_name: (entry.tracks as any).name,
    lap_time_ms: entry.lap_time_ms,
    lap_time_formatted: formatLapTime(entry.lap_time_ms),
    gap_to_p1_ms: entry.lap_time_ms - fastestMs,
    gap_to_p1_formatted: formatGap(entry.lap_time_ms - fastestMs),
    submitted_at: entry.submitted_at,
    is_fastest: index === 0,
    validation_status: (entry as any).validation_status ?? "valid",
    flag_reason: (entry as any).flag_reason ?? undefined,
  }));
}

export async function getLatestSubmissions(limit = 8) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lap_times")
    .select(
      `
      id,
      lap_time_ms,
      submitted_at,
      users(driver_name, team_name),
      cars(name),
      tracks(name)
    `
    )
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching latest submissions:", error);
    return [];
  }

  return (data || []).map((entry) => ({
    id: entry.id,
    lap_time_ms: entry.lap_time_ms,
    lap_time_formatted: formatLapTime(entry.lap_time_ms),
    submitted_at: entry.submitted_at,
    driver_name: (entry.users as any)?.driver_name || "Unknown",
    team_name: (entry.users as any)?.team_name,
    car_name: (entry.cars as any)?.name || "Unknown",
    track_name: (entry.tracks as any)?.name || "Unknown",
  }));
}

export async function getDriverPersonalBest(
  driverId: string,
  carId: string,
  trackId: string
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lap_times")
    .select("lap_time_ms")
    .eq("driver_id", driverId)
    .eq("car_id", carId)
    .eq("track_id", trackId)
    .order("lap_time_ms", { ascending: true })
    .limit(1)
    .single();
  return data?.lap_time_ms ?? null;
}

export async function getTrackRecord(
  carId: string,
  trackId: string
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lap_times")
    .select("lap_time_ms")
    .eq("car_id", carId)
    .eq("track_id", trackId)
    .order("lap_time_ms", { ascending: true })
    .limit(1)
    .single();
  return data?.lap_time_ms ?? null;
}

export async function getDriverLapHistory(driverId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lap_times")
    .select(`
      id,
      lap_time_ms,
      submitted_at,
      validation_status,
      cars(id, name, class),
      tracks(id, name)
    `)
    .eq("driver_id", driverId)
    .order("submitted_at", { ascending: true });
  return (data || []).map((lap) => ({
    id: lap.id,
    lap_time_ms: lap.lap_time_ms,
    lap_time_formatted: formatLapTime(lap.lap_time_ms),
    submitted_at: lap.submitted_at,
    validation_status: (lap as any).validation_status ?? "valid",
    car: lap.cars as any,
    track: lap.tracks as any,
  }));
}

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export async function getActiveSeason() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();
  return data || null;
}

export async function getAllSeasons() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getChampionshipStandings(seasonId: string) {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (!season) return { season: null, standings: [] };

  const { data: laps } = await supabase
    .from("lap_times")
    .select("driver_id, car_id, track_id, lap_time_ms, users(driver_name, team_name)")
    .gte("submitted_at", season.start_date)
    .lte("submitted_at", season.end_date + "T23:59:59Z");

  if (!laps || laps.length === 0) return { season, standings: [] };

  // Best lap per driver per car+track combo
  const bestMap = new Map<string, { driverId: string; driverName: string; teamName: string; carId: string; trackId: string; bestMs: number }>();
  for (const lap of laps) {
    const key = `${lap.driver_id}__${lap.car_id}__${lap.track_id}`;
    const existing = bestMap.get(key);
    if (!existing || lap.lap_time_ms < existing.bestMs) {
      bestMap.set(key, {
        driverId: lap.driver_id,
        driverName: (lap.users as any)?.driver_name || "Unknown",
        teamName: (lap.users as any)?.team_name || "",
        carId: lap.car_id,
        trackId: lap.track_id,
        bestMs: lap.lap_time_ms,
      });
    }
  }

  // Group by car+track combo and rank drivers
  const comboMap = new Map<string, typeof Array.prototype>();
  for (const entry of bestMap.values()) {
    const comboKey = `${entry.carId}__${entry.trackId}`;
    if (!comboMap.has(comboKey)) comboMap.set(comboKey, []);
    (comboMap.get(comboKey) as any[]).push(entry);
  }

  // Accumulate points per driver
  const pointsMap = new Map<string, { driverName: string; teamName: string; points: number; wins: number; podiums: number; scoredCombos: number }>();
  for (const entries of comboMap.values()) {
    (entries as any[]).sort((a: any, b: any) => a.bestMs - b.bestMs);
    (entries as any[]).forEach((entry: any, i: number) => {
      const pts = F1_POINTS[i] ?? 0;
      if (pts === 0) return;
      const existing = pointsMap.get(entry.driverId);
      if (existing) {
        existing.points += pts;
        if (i === 0) existing.wins++;
        if (i < 3) existing.podiums++;
        existing.scoredCombos++;
      } else {
        pointsMap.set(entry.driverId, {
          driverName: entry.driverName,
          teamName: entry.teamName,
          points: pts,
          wins: i === 0 ? 1 : 0,
          podiums: i < 3 ? 1 : 0,
          scoredCombos: 1,
        });
      }
    });
  }

  const standings = Array.from(pointsMap.values())
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((s, i) => ({ rank: i + 1, ...s }));

  return { season, standings };
}

// ── Streak helpers ──────────────────────────────────────────────────────────

function calcStreaks(submittedDates: string[]): { current: number; longest: number } {
  if (submittedDates.length === 0) return { current: 0, longest: 0 };

  // Unique calendar dates (UTC), sorted ascending
  const uniqueDates = [...new Set(submittedDates.map((d) => d.slice(0, 10)))].sort();

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    prev.setUTCDate(prev.getUTCDate() + 1);
    if (prev.toISOString().slice(0, 10) === uniqueDates[i]) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak — must include today or yesterday to be "active"
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const last = uniqueDates[uniqueDates.length - 1];

  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    let anchor = last;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const expected = new Date(anchor);
      expected.setUTCDate(expected.getUTCDate() - 1);
      const exp = expected.toISOString().slice(0, 10);
      if (uniqueDates[i] === exp) { current++; anchor = exp; } else break;
    }
  }

  return { current, longest };
}

export async function getDriverStreak(driverId: string): Promise<{ current: number; longest: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lap_times")
    .select("submitted_at")
    .eq("driver_id", driverId)
    .order("submitted_at", { ascending: true });
  return calcStreaks((data || []).map((r) => r.submitted_at));
}

// ── Team standings ───────────────────────────────────────────────────────────

export async function getTeamStandings() {
  const supabase = await createClient();

  // All users with a team
  const { data: users } = await supabase
    .from("users")
    .select("id, driver_name, team_name")
    .not("team_name", "is", null);

  if (!users || users.length === 0) return [];

  // All laps (we need to aggregate per team)
  const { data: laps } = await supabase
    .from("lap_times")
    .select("driver_id, lap_time_ms, lap_time_formatted, submitted_at");

  const allLaps = laps || [];

  // Group users by team
  const teamMap = new Map<string, { members: typeof users; totalLaps: number; bestLapMs: number | null; bestLapFormatted: string | null }>();
  for (const user of users) {
    const t = user.team_name!;
    if (!teamMap.has(t)) teamMap.set(t, { members: [], totalLaps: 0, bestLapMs: null, bestLapFormatted: null });
    teamMap.get(t)!.members.push(user);
  }

  // Accumulate laps per team
  const memberIdToTeam = new Map(users.map((u) => [u.id, u.team_name!]));
  for (const lap of allLaps) {
    const team = memberIdToTeam.get(lap.driver_id);
    if (!team || !teamMap.has(team)) continue;
    const entry = teamMap.get(team)!;
    entry.totalLaps++;
    if (entry.bestLapMs === null || lap.lap_time_ms < entry.bestLapMs) {
      entry.bestLapMs = lap.lap_time_ms;
      entry.bestLapFormatted = lap.lap_time_formatted;
    }
  }

  return Array.from(teamMap.entries())
    .map(([name, data]) => ({
      team_name: name,
      member_count: data.members.length,
      total_laps: data.totalLaps,
      best_lap_ms: data.bestLapMs,
      best_lap_formatted: data.bestLapFormatted,
    }))
    .sort((a, b) => b.total_laps - a.total_laps);
}

export async function getTeamChampionshipStandings(seasonId: string) {
  const { season, standings: driverStandings } = await getChampionshipStandings(seasonId);
  if (!season) return { season: null, teamStandings: [] };

  // Sum individual driver points by team
  const teamMap = new Map<string, { points: number; wins: number; podiums: number; memberCount: number; drivers: string[] }>();
  for (const d of driverStandings) {
    if (!d.teamName) continue;
    const existing = teamMap.get(d.teamName);
    if (existing) {
      existing.points += d.points;
      existing.wins += d.wins;
      existing.podiums += d.podiums;
      existing.memberCount++;
      existing.drivers.push(d.driverName);
    } else {
      teamMap.set(d.teamName, { points: d.points, wins: d.wins, podiums: d.podiums, memberCount: 1, drivers: [d.driverName] });
    }
  }

  const teamStandings = Array.from(teamMap.entries())
    .map(([name, data], i) => ({ rank: i + 1, team_name: name, ...data }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  return { season, teamStandings };
}

export async function getDashboardStats() {
  const supabase = await createClient();

  const [driversRes, lapsRes, tracksRes] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("lap_times").select("id", { count: "exact", head: true }),
    supabase.from("tracks").select("id", { count: "exact", head: true }),
  ]);

  return {
    total_drivers: driversRes.count || 0,
    total_laps: lapsRes.count || 0,
    total_tracks: tracksRes.count || 0,
  };
}

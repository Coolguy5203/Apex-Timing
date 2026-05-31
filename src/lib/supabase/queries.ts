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

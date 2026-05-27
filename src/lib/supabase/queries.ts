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
export async function getLeaderboard(
  carId?: string,
  trackId?: string
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
      users!inner(driver_name, team_name),
      cars!inner(id, name),
      tracks!inner(id, name)
    `
    )
    .order("lap_time_ms", { ascending: true });

  if (carId) query = query.eq("car_id", carId);
  if (trackId) query = query.eq("track_id", trackId);

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

import { createClient } from "@/lib/supabase/server";

export interface DriverRating {
  userId: string;
  driverName: string;
  rating: number;      // 0–100, higher = faster
  combosRun: number;
}

/**
 * Compute a skill rating for every driver who has submitted at least one lap.
 * Rating = average percentile rank across all car+track combos the driver has run.
 * A driver ranked P1 of 10 on a combo scores 100; last of 10 scores ~0.
 */
export async function computeAllRatings(): Promise<DriverRating[]> {
  const supabase = await createClient();

  // Get all valid laps
  const { data: laps } = await supabase
    .from("lap_times")
    .select("driver_id, car_id, track_id, lap_time_ms, users(driver_name)")
    .neq("validation_status", "flagged");

  if (!laps || laps.length === 0) return [];

  // Best lap per driver per combo
  const bestMap = new Map<string, { driverId: string; ms: number }>();
  for (const lap of laps) {
    const key = `${lap.driver_id}|${lap.car_id}|${lap.track_id}`;
    const existing = bestMap.get(key);
    if (!existing || lap.lap_time_ms < existing.ms) {
      bestMap.set(key, { driverId: lap.driver_id, ms: lap.lap_time_ms });
    }
  }

  // Group by combo
  const comboMap = new Map<string, { driverId: string; ms: number }[]>();
  for (const [key, val] of bestMap.entries()) {
    const [, carId, trackId] = key.split("|");
    const comboKey = `${carId}|${trackId}`;
    if (!comboMap.has(comboKey)) comboMap.set(comboKey, []);
    comboMap.get(comboKey)!.push(val);
  }

  // For each combo, compute each driver's percentile
  const driverPercentiles = new Map<string, number[]>();
  for (const entries of comboMap.values()) {
    if (entries.length < 2) continue; // need at least 2 to compare
    const sorted = [...entries].sort((a, b) => a.ms - b.ms);
    const total = sorted.length;
    sorted.forEach((entry, i) => {
      const percentile = ((total - 1 - i) / (total - 1)) * 100;
      if (!driverPercentiles.has(entry.driverId)) driverPercentiles.set(entry.driverId, []);
      driverPercentiles.get(entry.driverId)!.push(percentile);
    });
  }

  // Average percentile per driver
  const driverNames = new Map<string, string>();
  for (const lap of laps) {
    driverNames.set(lap.driver_id, (lap.users as any)?.driver_name ?? "Unknown");
  }

  const ratings: DriverRating[] = [];
  for (const [userId, percentiles] of driverPercentiles.entries()) {
    const avg = percentiles.reduce((s, v) => s + v, 0) / percentiles.length;
    ratings.push({
      userId,
      driverName: driverNames.get(userId) ?? "Unknown",
      rating: Math.round(avg * 10) / 10,
      combosRun: percentiles.length,
    });
  }

  return ratings.sort((a, b) => b.rating - a.rating);
}

/**
 * Given a sorted list of rated drivers, pair them by adjacent skill level.
 * Returns an array of [driverA, driverB] pairs.
 * Odd driver out gets a bye (not included).
 */
export function pairDrivers(ratings: DriverRating[]): [DriverRating, DriverRating][] {
  const pairs: [DriverRating, DriverRating][] = [];
  for (let i = 0; i + 1 < ratings.length; i += 2) {
    pairs.push([ratings[i], ratings[i + 1]]);
  }
  return pairs;
}

import type { CarStats } from "@/components/cars/CarXray";

/** Class-based aero profile (0-100). Real iRacing car classes ranked by downforce level. */
export function classAeroProfile(cls: string): number {
  const c = cls.toLowerCase();
  if (c.includes("formula 1")) return 98;
  if (c.includes("formula 2")) return 93;
  if (c.includes("formula 3")) return 88;
  if (c.includes("formula 4")) return 80;
  if (c.includes("formula ford")) return 72;
  if (c.includes("formula") || c.includes("legacy formula")) return 82;
  if (c.includes("indy")) return 95;
  if (c.includes("lmh") || c.includes("gtp")) return 94;
  if (c.includes("lmp1")) return 96;
  if (c.includes("lmp2")) return 88;
  if (c.includes("lmp3")) return 80;
  if (c.includes("prototype")) return 84;
  if (c.includes("gte") || c.includes("ford gt gte")) return 78;
  if (c.includes("gt1")) return 76;
  if (c.includes("gt2")) return 72;
  if (c.includes("gt3") || c.includes("legacy gt3")) return 68;
  if (c.includes("gt4")) return 58;
  if (c.includes("gt")) return 62;
  if (c.includes("tcr") || c.includes("legacy tcr")) return 38;
  if (c.includes("supercars")) return 48;
  if (c.includes("nascar cup")) return 15;
  if (c.includes("nascar truck")) return 12;
  if (c.includes("nascar xfinity")) return 12;
  if (c.includes("nascar") || c.includes("legacy nascar")) return 12;
  if (c.includes("arca")) return 10;
  if (c.includes("oval") || c.includes("indycar")) return 22;
  if (c.includes("dirt")) return 5;
  if (c.includes("rallycross") || c.includes("off road")) return 8;
  if (c.includes("modified")) return 18;
  if (c.includes("road") || c.includes("legacy road")) return 42;
  if (c.includes("historic") || c.includes("legacy")) return 30;
  return 50;
}

/** Class-based power profile (0-100). */
export function classPowerProfile(cls: string): number {
  const c = cls.toLowerCase();
  if (c.includes("formula 1")) return 100;
  if (c.includes("indy")) return 97;
  if (c.includes("lmh") || c.includes("gtp")) return 96;
  if (c.includes("lmp1")) return 94;
  if (c.includes("formula 2")) return 88;
  if (c.includes("formula 3")) return 78;
  if (c.includes("nascar cup")) return 90;
  if (c.includes("nascar")) return 82;
  if (c.includes("arca")) return 80;
  if (c.includes("lmp2")) return 82;
  if (c.includes("gte") || c.includes("ford gt gte")) return 78;
  if (c.includes("gt1")) return 82;
  if (c.includes("lmp3")) return 72;
  if (c.includes("gt2")) return 70;
  if (c.includes("gt3") || c.includes("legacy gt3")) return 66;
  if (c.includes("formula 4") || c.includes("formula ford")) return 60;
  if (c.includes("formula")) return 72;
  if (c.includes("gt4")) return 54;
  if (c.includes("gt")) return 60;
  if (c.includes("supercars")) return 72;
  if (c.includes("tcr")) return 44;
  if (c.includes("modified")) return 60;
  if (c.includes("dirt")) return 55;
  if (c.includes("rallycross")) return 50;
  if (c.includes("road") || c.includes("historic")) return 38;
  return 55;
}

/** Compute ratings entirely from lap data + class profile. */
export function computeCarStats(
  carClass: string,
  totalLaps: number,
  maxLapsAnyClass: number,      // max laps any car in the same class has
  uniqueDrivers: number,
  maxDriversAnyClass: number,
  validLaps: number,
  lapTimesMs: number[],         // all valid lap times
  uniqueTracks: number,
  totalTrackCount: number,
): CarStats {
  // ── Aero (class-based) ────────────────────────────────────────────────────
  const aeroBase = classAeroProfile(carClass);

  // ── Power (blend of class base + performance vs class average) ───────────
  const powerBase = classPowerProfile(carClass);
  // Boost if many laps (well-used = community vetted power)
  const powerBoost = Math.min(5, Math.round(totalLaps / 20));
  const powertrain = Math.min(99, powerBase + powerBoost);

  // ── Chassis (driver pool) ─────────────────────────────────────────────────
  const chassis = maxDriversAnyClass > 0
    ? Math.min(98, 30 + Math.round((uniqueDrivers / maxDriversAnyClass) * 68))
    : 30;

  // ── Consistency / Front Suspension (lap time std dev) ─────────────────────
  let frontSuspension = 50;
  if (lapTimesMs.length >= 3) {
    const mean = lapTimesMs.reduce((s, v) => s + v, 0) / lapTimesMs.length;
    const variance = lapTimesMs.reduce((s, v) => s + (v - mean) ** 2, 0) / lapTimesMs.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // coefficient of variation
    // Low CV = consistent = good suspension
    frontSuspension = Math.min(95, Math.round(100 - cv * 1500));
    frontSuspension = Math.max(20, frontSuspension);
  }

  // ── Rear Suspension (stability — similar to front but offset by power) ────
  const rearSuspension = Math.min(95, Math.round((frontSuspension * 0.85) + (aeroBase * 0.15)));

  // ── Cooling / Reliability ─────────────────────────────────────────────────
  const cooling = totalLaps > 0
    ? Math.min(98, Math.round((validLaps / totalLaps) * 100))
    : 70;

  // ── Braking (versatility — number of tracks run) ─────────────────────────
  const braking = totalTrackCount > 0
    ? Math.min(95, 20 + Math.round((uniqueTracks / totalTrackCount) * 75))
    : 20;

  return {
    powertrain: Math.round(powertrain),
    frontAero: Math.round(aeroBase),
    rearAero: Math.round(aeroBase * 0.95),
    frontSuspension: Math.round(frontSuspension),
    rearSuspension: Math.round(rearSuspension),
    chassis: Math.round(chassis),
    cooling: Math.round(cooling),
    braking: Math.round(braking),
  };
}

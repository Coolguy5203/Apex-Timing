// Endurance race strategy calculation engine — iRacing single-compound

export interface Tire {
  name: string;
  baseline: number;   // seconds
  degradation: number; // s/lap
  maxLife: number;    // laps before cliff
}

export interface PitService {
  fuelAdded: number;
  tireChange: boolean;
  driverSwap: boolean;
  timeLoss: number;
}

export interface Stint {
  startLap: number;
  endLap: number;
  numLaps: number;
  lapTimes: number[];
  fuelAtStart: number;
  fuelAtEnd: number;
  driverNumber: number;
  tireDeg: number;
  pitService: PitService | null;
}

export interface Strategy {
  pitWindows: number[];
  stints: Stint[];
  totalTime: number;
  numStops: number;
  numDriverSwaps: number;
  avgFuelPerStop: number;
  pitIntervalLaps: number;
}

export const DEFAULT_TIRE: Tire = {
  name: 'Spec Tire',
  baseline: 90.0,
  degradation: 0.05,
  maxLife: 50,
};

export function parseTimeString(str: string): number {
  if (!str) return 90;
  const parts = str.split(':');
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(str);
}

export function formatLapTimeSec(seconds: number): string {
  if (isNaN(seconds) || seconds == null) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function formatTotalTime(seconds: number): string {
  if (isNaN(seconds) || seconds == null) return '-:--:--.--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}:${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
}

export function calcTotalLaps(durationHours: number, avgLapTimeSeconds: number): number {
  if (!durationHours || !avgLapTimeSeconds) return 0;
  return Math.ceil((durationHours * 3600) / avgLapTimeSeconds);
}

export function calcLapTimes(
  tire: Tire,
  numLaps: number,
  fuelAtStart: number,
  fuelEffect = 0.03,
): number[] {
  const times: number[] = [];
  for (let i = 0; i < numLaps; i++) {
    const lapInStint = i + 1;
    const tireDeg = lapInStint * tire.degradation;
    const tireCliff = lapInStint > tire.maxLife ? 1.5 * (lapInStint - tire.maxLife) : 0;
    const fuelRemaining = Math.max(0, fuelAtStart - i);
    const fuelPenalty = fuelRemaining * fuelEffect;
    times.push(tire.baseline + tireDeg + tireCliff + fuelPenalty);
  }
  return times;
}

export function calcPitLoss(fixedServiceTime: number, refuelTimePerLap: number, fuelAdded: number): number {
  return fixedServiceTime + refuelTimePerLap * fuelAdded;
}

export interface GenerateStrategyParams {
  raceLaps: number;
  tire: Tire;
  fuelTankLaps: number;
  fixedServiceTime: number;
  refuelTimePerLap: number;
  numDrivers: number;
  maxDriverStintLaps: number;
  pitIntervalLaps: number;
  fuelEffect?: number;
}

export function generateStrategy(params: GenerateStrategyParams): Strategy {
  const {
    raceLaps, tire, fuelTankLaps, fixedServiceTime, refuelTimePerLap,
    numDrivers, maxDriverStintLaps, pitIntervalLaps, fuelEffect = 0.03,
  } = params;

  const hardMax = Math.min(fuelTankLaps, tire.maxLife, maxDriverStintLaps || Infinity);
  const interval = Math.min(pitIntervalLaps || fuelTankLaps, hardMax);

  const pitWindows: number[] = [];
  let lap = interval;
  while (lap < raceLaps) {
    pitWindows.push(Math.round(lap));
    lap += interval;
  }

  const numStops = pitWindows.length;
  const numStints = numStops + 1;

  function getDriver(stintIndex: number): number {
    if (numDrivers <= 1) return 1;
    return (stintIndex % numDrivers) + 1;
  }

  const stints: Stint[] = [];
  let fuelLevel = fuelTankLaps;
  const boundaries = [1, ...pitWindows.map(l => l + 1), raceLaps + 1];

  for (let i = 0; i < numStints; i++) {
    const startLap = boundaries[i];
    const endLap = boundaries[i + 1] - 1;
    const numLaps = endLap - startLap + 1;
    const fuelAtStart = fuelLevel;
    const lapTimes = calcLapTimes(tire, numLaps, fuelAtStart, fuelEffect);
    const fuelAtEnd = Math.max(0, fuelAtStart - numLaps);
    const driverNumber = getDriver(i);

    let pitService: PitService | null = null;
    if (i < numStints - 1) {
      const nextDriver = getDriver(i + 1);
      const isDriverSwap = numDrivers > 1 && nextDriver !== driverNumber;
      const fuelToAdd = Math.min(fuelTankLaps - fuelAtEnd, fuelTankLaps);
      const changeTires = fuelAtEnd < 5 || numLaps >= tire.maxLife * 0.9;
      pitService = {
        fuelAdded: fuelToAdd,
        tireChange: changeTires,
        driverSwap: isDriverSwap,
        timeLoss: calcPitLoss(fixedServiceTime, refuelTimePerLap, fuelToAdd),
      };
      fuelLevel = fuelAtEnd + fuelToAdd;
    }

    stints.push({
      startLap, endLap, numLaps, lapTimes,
      fuelAtStart, fuelAtEnd, driverNumber,
      tireDeg: lapTimes[lapTimes.length - 1] - lapTimes[0],
      pitService,
    });
  }

  const drivingTime = stints.reduce((sum, s) => sum + s.lapTimes.reduce((a, b) => a + b, 0), 0);
  const pitTime = stints.slice(0, -1).reduce((sum, s) => sum + (s.pitService?.timeLoss || 0), 0);
  const totalTime = drivingTime + pitTime;
  const numDriverSwaps = stints.slice(0, -1).filter(s => s.pitService?.driverSwap).length;
  const avgFuelPerStop = numStops > 0
    ? stints.slice(0, -1).reduce((sum, s) => sum + (s.pitService?.fuelAdded || 0), 0) / numStops
    : 0;

  return { pitWindows, stints, totalTime, numStops, numDriverSwaps, avgFuelPerStop, pitIntervalLaps: interval };
}

export function findUndercutWindows(
  stints: Stint[],
  tire: Tire,
  fixedServiceTime: number,
  refuelTimePerLap: number,
  fuelTankLaps: number,
  fuelEffect = 0.03,
): { lap: number; timeSaving: string }[] {
  const windows: { lap: number; timeSaving: string }[] = [];
  for (let si = 0; si < stints.length - 1; si++) {
    const stint = stints[si];
    const undercutLap = stint.endLap - 1;
    if (undercutLap < stint.startLap) continue;

    const lapInStint = undercutLap - stint.startLap;
    const currentLapTime = stint.lapTimes[lapInStint] || 0;
    const nextLapTime = stint.lapTimes[lapInStint + 1] || 0;
    const nextStint = stints[si + 1];
    if (!nextStint) continue;

    const freshFirstLap = tire.baseline + tire.degradation + fuelTankLaps * fuelEffect;
    const pitLoss = calcPitLoss(fixedServiceTime, refuelTimePerLap, stint.pitService?.fuelAdded || fuelTankLaps);
    const timeSaving = currentLapTime + nextLapTime - freshFirstLap - pitLoss;

    if (timeSaving > 0) {
      windows.push({ lap: undercutLap, timeSaving: timeSaving.toFixed(3) });
    }
  }
  return windows;
}

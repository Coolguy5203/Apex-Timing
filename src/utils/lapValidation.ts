// Returns flag reason string if the lap should be flagged, null if clean.
export function checkLapSuspicious(
  newLapMs: number,
  personalBestMs: number | null,
  trackRecordMs: number | null
): string | null {
  if (personalBestMs !== null && newLapMs < personalBestMs * 0.92) {
    const pct = (((personalBestMs - newLapMs) / personalBestMs) * 100).toFixed(1);
    return `${pct}% faster than personal best`;
  }
  if (trackRecordMs !== null && newLapMs < trackRecordMs) {
    return "Faster than current track record";
  }
  return null;
}

// Returns flag reason if the session lap count looks unreasonable, null if fine.
export function checkSessionLapsSuspicious(lapsInSession: number | null): string | null {
  if (lapsInSession === null) return null;
  if (lapsInSession > 200) return `Implausible session lap count: ${lapsInSession} laps`;
  if (lapsInSession > 100) return `Very high session lap count: ${lapsInSession} laps`;
  if (lapsInSession > 50)  return `Unusually high session lap count: ${lapsInSession} laps`;
  return null;
}

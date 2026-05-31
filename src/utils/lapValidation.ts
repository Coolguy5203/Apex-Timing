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

export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

export function parseLapTime(timeStr: string): number | null {
  const regex = /^(\d+):(\d{2})\.(\d{3})$/;
  const match = timeStr.match(regex);

  if (!match) return null;

  const minutes = parseInt(match[1]);
  const seconds = parseInt(match[2]);
  const milliseconds = parseInt(match[3]);

  if (seconds >= 60) return null;

  return minutes * 60000 + seconds * 1000 + milliseconds;
}

export function formatGap(gapMs: number): string {
  if (gapMs === 0) return "—";
  const seconds = gapMs / 1000;
  return `+${seconds.toFixed(3)}s`;
}

export function getPositionSuffix(position: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = position % 100;
  return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "text-neon-purple";
    case 2:
      return "text-lap-silver";
    case 3:
      return "text-lap-bronze";
    default:
      return "text-race-dim";
  }
}

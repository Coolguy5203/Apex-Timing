export interface Rank {
  level: number;
  name: string;
  short: string;
  maxPerTeam: number | null; // null = unlimited
  grantsPro: boolean;
  color: string;
  bg: string;
  border: string;
  insignia: string;
}

export const RANKS: Rank[] = [
  {
    level: 0,
    name: "MEMBER",
    short: "MBR",
    maxPerTeam: null,
    grantsPro: false,
    color: "text-race-dim",
    bg: "bg-race-muted",
    border: "border-race-border",
    insignia: "▪",
  },
  {
    level: 1,
    name: "ENGINEER",
    short: "ENG",
    maxPerTeam: 4,
    grantsPro: false,
    color: "text-neon-green",
    bg: "bg-neon-green/10",
    border: "border-neon-green/30",
    insignia: "⚙",
  },
  {
    level: 2,
    name: "RACE DIRECTOR",
    short: "RD",
    maxPerTeam: 1,
    grantsPro: true,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    insignia: "🏁",
  },
];

export function getRank(level: number): Rank {
  return RANKS[Math.min(Math.max(level ?? 0, 0), RANKS.length - 1)];
}

/** Only RACE DIRECTOR (rank 2) can manage team ranks */
export function canManage(actorRank: number): boolean {
  return actorRank === 2;
}

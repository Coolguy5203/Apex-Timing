import { getRank } from "@/lib/ranks";
import clsx from "clsx";

interface RankBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export function RankBadge({ level, size = "md", showName = true }: RankBadgeProps) {
  const rank = getRank(level);
  if (level === 0) return null; // PRIVATE has no visible badge

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded font-mono font-bold tracking-widest border",
        rank.color, rank.bg, rank.border,
        size === "sm" && "px-1.5 py-0.5 text-[9px]",
        size === "md" && "px-2 py-0.5 text-[10px]",
        size === "lg" && "px-3 py-1 text-xs",
      )}
    >
      <span>{rank.insignia}</span>
      {showName && <span>{rank.short}</span>}
    </span>
  );
}

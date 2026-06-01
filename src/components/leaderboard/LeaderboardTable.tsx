"use client";

import { formatRelativeTime } from "@/utils/lapTime";
import type { LeaderboardEntry } from "@/types";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";
import { Zap, AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const rankStyles: Record<number, { rank: string; bg: string; border: string }> = {
  1: { rank: "text-neon-purple", bg: "bg-neon-purple/5", border: "border-l-2 border-l-neon-purple" },
  2: { rank: "text-lap-silver", bg: "bg-white/[0.02]", border: "border-l-2 border-l-lap-silver" },
  3: { rank: "text-lap-bronze", bg: "bg-amber-900/5", border: "border-l-2 border-l-lap-bronze" },
};

function getRankStyle(rank: number) {
  return rankStyles[rank] || { rank: "text-race-dim", bg: "", border: "border-l-2 border-l-transparent" };
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const myEntry = currentUserId ? entries.find((e) => e.driver_id === currentUserId) : undefined;
  const myEntryVisible = !!myEntry; // already in the list
  const myRank = myEntry?.rank;
  if (entries.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="text-5xl mb-4">🏁</div>
        <p className="text-race-dim font-mono text-sm tracking-widest">NO TIMES SET</p>
        <p className="text-race-dim/60 font-mono text-xs mt-2 mb-6">
          Be the first to post a time on this combination
        </p>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple font-mono font-bold text-xs tracking-widest rounded-lg transition-all"
        >
          <Plus size={13} />
          SUBMIT A LAP
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-0 border-b border-race-border">
        {["POS", "DRIVER", "TEAM", "CAR", "GAP", "TIME", "DATE"].map((col, i) => (
          <div key={col} className={clsx("px-4 py-3 text-xs font-mono font-medium text-race-dim tracking-widest",
            i === 0 && "w-14 text-center",
            i === 2 && "hidden md:block",
            i === 3 && "hidden md:block",
            i === 6 && "hidden md:block text-right",
            i === 4 && "hidden sm:block text-right",
            i === 5 && "text-right"
          )}>
            {col}
          </div>
        ))}
      </div>

      <div>
        {entries.map((entry, index) => {
          const style = getRankStyle(entry.rank);
          const isMe = currentUserId && entry.driver_id === currentUserId;
          return (
            <div
              key={`${entry.driver_id}-${entry.car_id}-${entry.track_id}`}
              className={clsx(
                "leaderboard-row grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-0 border-b border-race-border/40 items-center",
                isMe ? "bg-neon-purple/5 border-l-2 border-l-neon-purple" : clsx(style.bg, style.border)
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="px-4 py-4 w-14 text-center">
                <span className={clsx("font-display font-black text-xl", style.rank)}>{entry.rank}</span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {entry.is_fastest && <Zap size={12} className="text-neon-purple flex-shrink-0" />}
                 <Link href={`/driver/${encodeURIComponent(entry.driver_name.toLowerCase().replace(/\s+/g, "-"))}`} className="font-display font-bold text-race-text tracking-wide text-sm hover:text-neon-purple transition-colors">
                    {entry.driver_name.toUpperCase()}
                  </Link>
                  {isMe && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon-purple/10 border border-neon-purple/30 text-neon-purple">YOU</span>}
                </div>
                <div className="md:hidden mt-0.5">
                  <span className="text-race-dim text-xs font-mono">{entry.car_name}</span>
                </div>
              </div>
              <div className="hidden md:block px-4 py-4">
                {entry.team_name ? (
                  <Badge variant="muted" size="sm">{entry.team_name.toUpperCase()}</Badge>
                ) : (
                  <span className="text-race-dim/40 text-xs font-mono">—</span>
                )}
              </div>
              <div className="hidden md:block px-4 py-4">
                <span className="text-race-dim text-sm font-mono">{entry.car_name}</span>
              </div>
              <div className="hidden sm:block px-4 py-4 text-right">
                <span className={clsx("font-mono text-sm font-medium", entry.is_fastest ? "text-neon-green" : "text-race-dim")}>
                  {entry.gap_to_p1_formatted}
                </span>
              </div>
              <div className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {entry.validation_status === "flagged" && (
                    <span title={entry.flag_reason ?? "Flagged for review"}>
                      <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0" />
                    </span>
                  )}
                  {entry.validation_status === "approved" && (
                    <span title="Admin verified">
                      <ShieldCheck size={13} className="text-neon-green flex-shrink-0" />
                    </span>
                  )}
                  <span className={clsx("font-mono font-bold", entry.is_fastest ? "lap-time-fastest text-lg" : "text-race-text text-base")}>
                    {entry.lap_time_formatted}
                  </span>
                </div>
              </div>
              <div className="hidden md:block px-4 py-4 text-right">
                <span className="text-race-dim text-xs font-mono">{formatRelativeTime(entry.submitted_at)}</span>
              </div>
            </div>
          );
        })}

        {/* YOUR POSITION — shown when the current user is not in the visible list */}
        {currentUserId && !myEntryVisible && myRank === undefined && (
          <div className="border-t-2 border-dashed border-neon-purple/20 bg-neon-purple/5 px-4 py-3 flex items-center gap-3">
            <span className="text-neon-purple text-xs font-mono font-bold tracking-widest">YOUR POSITION</span>
            <span className="text-race-dim text-xs font-mono">Submit a lap to appear on this leaderboard</span>
            <Link href="/submit" className="ml-auto text-xs font-mono text-neon-purple hover:underline">SUBMIT →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

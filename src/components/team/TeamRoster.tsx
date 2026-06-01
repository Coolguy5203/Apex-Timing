"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/utils/lapTime";
import { getRank, canManage, RANKS } from "@/lib/ranks";
import { RankBadge } from "@/components/ui/RankBadge";
import { ChevronDown, Medal, Zap, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface Driver {
  id: string;
  driver_name: string;
  team_rank: number;
  lap_count: number;
  best_lap: any;
  last_active: string;
}

interface TeamRosterProps {
  drivers: Driver[];
  currentUserId: string;
  currentUserRank: number;
}

export function TeamRoster({ drivers, currentUserId, currentUserRank }: TeamRosterProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; driverId: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const canEdit = canManage(currentUserRank);

  const showMsg = (type: "success" | "error", text: string, driverId: string) => {
    setMessage({ type, text, driverId });
    setTimeout(() => setMessage(null), 5000);
  };

  const changeRank = async (targetId: string, newRank: number, targetName: string) => {
    // Warn when transferring the RD role — it demotes the current user
    if (newRank === 2 && currentUserRank === 2) {
      if (!confirm(`Transfer the 🏁 Race Director role to ${targetName}?\n\nYou will be demoted to Member. This cannot be undone without them transferring it back.`)) return;
    }
    setLoadingId(targetId);
    setOpenMenu(null);
    try {
      const res = await fetch("/api/team/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetId, new_rank: newRank }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg("error", data.error, targetId);
      } else {
        const rank = getRank(newRank);
        const msg = data.pro_code
          ? `Promoted to ${rank.name} — PRO code ${data.pro_code} sent via notification`
          : `Rank updated to ${rank.name}`;
        showMsg("success", msg, targetId);
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      showMsg("error", "Network error", targetId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Rank legend */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-race-border">
        {RANKS.slice(1).map((rank) => (
          <div key={rank.level} className={clsx("flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono", rank.bg, rank.border, rank.color)}>
            <span>{rank.insignia}</span>
            <span className="font-bold">{rank.name}</span>
            <span className="opacity-60">· max {rank.maxPerTeam}/team · PRO</span>
          </div>
        ))}
      </div>

      {drivers.map((driver, index) => {
        const rank = getRank(driver.team_rank);
        const isMe = driver.id === currentUserId;
        const isLoading = loadingId === driver.id;
        const msg = message?.driverId === driver.id ? message : null;

        return (
          <div
            key={driver.id}
            className={clsx(
              "flex items-center gap-4 p-4 rounded-lg border transition-all duration-200",
              isMe ? "border-neon-purple/30 bg-neon-purple/5" : "border-race-border bg-race-dark hover:border-neon-purple/20"
            )}
          >
            {/* Position */}
            <div className="w-8 text-center flex-shrink-0">
              {index === 0
                ? <Medal size={18} className="text-neon-purple mx-auto" />
                : <span className={clsx("font-display font-black text-lg", index === 1 ? "text-lap-silver" : index === 2 ? "text-lap-bronze" : "text-race-dim")}>{index + 1}</span>
              }
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-lg bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-black text-neon-purple text-lg">
                {driver.driver_name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/driver/${driver.driver_name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="font-display font-bold text-race-text tracking-wide hover:text-neon-purple transition-colors"
                >
                  {driver.driver_name.toUpperCase()}
                </Link>
                {isMe && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon-purple/10 border border-neon-purple/30 text-neon-purple">YOU</span>}
                <RankBadge level={driver.team_rank} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="text-race-dim text-xs font-mono">{driver.lap_count} LAPS</span>
                {driver.best_lap && (
                  <span className="flex items-center gap-1 text-neon-purple text-xs font-mono">
                    <Zap size={10} />BEST: {driver.best_lap.lap_time_formatted}
                  </span>
                )}
                <span className="text-race-dim/60 text-xs font-mono">{formatRelativeTime(driver.last_active)}</span>
              </div>

              {/* Feedback message */}
              {msg && (
                <div className={clsx("flex items-center gap-1 mt-1.5 text-xs font-mono", msg.type === "success" ? "text-neon-green" : "text-red-400")}>
                  {msg.type === "success" ? <Check size={10} /> : <AlertCircle size={10} />}
                  {msg.text}
                </div>
              )}
            </div>

            {/* Rank controls — only shown to RACE DIRECTOR, not for themselves */}
            {canEdit && !isMe && (
              <div className="flex-shrink-0 relative">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-race-dim/30 border-t-neon-purple rounded-full animate-spin" />
                ) : (
                  <>
                    <button
                      onClick={() => setOpenMenu(openMenu === driver.id ? null : driver.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-race-dim hover:text-race-text border border-race-border hover:border-neon-purple/30 rounded transition-all"
                    >
                      <span>{rank.insignia} {rank.short}</span>
                      <ChevronDown size={11} className={clsx("transition-transform", openMenu === driver.id && "rotate-180")} />
                    </button>

                    {openMenu === driver.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-race-card border border-neon-purple/20 rounded-lg shadow-xl z-20 overflow-hidden">
                        {RANKS.map((r) => {
                          const isRDTransfer = r.level === 2 && currentUserRank === 2 && r.level !== driver.team_rank;
                          return (
                            <button
                              key={r.level}
                              onClick={() => changeRank(driver.id, r.level, driver.driver_name)}
                              disabled={r.level === driver.team_rank}
                              className={clsx(
                                "w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-left transition-colors",
                                r.level === driver.team_rank
                                  ? "bg-neon-purple/10 text-neon-purple cursor-default"
                                  : isRDTransfer
                                  ? "text-yellow-400 hover:bg-yellow-400/10"
                                  : "text-race-dim hover:bg-race-muted hover:text-race-text"
                              )}
                            >
                              <span className="w-4 text-center">{r.insignia}</span>
                              <span className="flex-1">{r.name}</span>
                              {r.level === driver.team_rank && <Check size={10} />}
                              {isRDTransfer && <span className="text-yellow-400/60 text-[9px]">TRANSFER</span>}
                              {r.grantsPro && r.level !== driver.team_rank && !isRDTransfer && (
                                <span className="text-yellow-400/60 text-[9px]">+PRO</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Lap count (right side) */}
            <div className="flex-shrink-0 text-right">
              <div className={`text-2xl font-display font-black ${index === 0 ? "text-neon-purple" : "text-race-text"}`}>
                {driver.lap_count}
              </div>
              <div className="text-race-dim text-xs font-mono">LAPS</div>
              <div className="text-race-dim/50 text-[10px] font-mono mt-0.5 hidden sm:block">{formatRelativeTime(driver.last_active)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

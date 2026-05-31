import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { getStreakInfo } from "@/lib/supabase/queries";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { StreakSaveBanner } from "@/components/ui/StreakSaveBanner";
import { Timer, Trophy, Zap, ChevronRight, TrendingDown } from "lucide-react";
import Link from "next/link";

interface PersonalDashboardProps {
  userId: string;
  driverName: string;
  driverSlug: string;
}

export async function PersonalDashboard({ userId, driverName, driverSlug }: PersonalDashboardProps) {
  const supabase = await createClient();

  const [recentRes, allLapsRes, streak] = await Promise.all([
    // Recent 5 laps
    supabase
      .from("lap_times")
      .select("id, lap_time_ms, lap_time_formatted, submitted_at, cars(name), tracks(name)")
      .eq("driver_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(5),
    // All laps for PB calculation
    supabase
      .from("lap_times")
      .select("lap_time_ms, car_id, track_id, cars(name, class), tracks(name)")
      .eq("driver_id", userId),
    // Streak
    getStreakInfo(userId),
  ]);

  const recentLaps = recentRes.data || [];
  const allLaps = allLapsRes.data || [];

  // Compute PBs: best time per car+track
  const pbMap = new Map<string, { carName: string; trackName: string; carClass: string; bestMs: number }>();
  for (const lap of allLaps) {
    const key = `${lap.car_id}__${lap.track_id}`;
    const existing = pbMap.get(key);
    if (!existing || lap.lap_time_ms < existing.bestMs) {
      pbMap.set(key, {
        carName: (lap.cars as any)?.name || "Unknown",
        trackName: (lap.tracks as any)?.name || "Unknown",
        carClass: (lap.cars as any)?.class || "",
        bestMs: lap.lap_time_ms,
      });
    }
  }
  const pbs = Array.from(pbMap.values()).sort((a, b) => a.bestMs - b.bestMs).slice(0, 5);

  const totalLaps = allLaps.length;
  const overallBest = allLaps.reduce((best, lap) =>
    !best || lap.lap_time_ms < best.lap_time_ms ? lap : best
  , null as any);

  if (totalLaps === 0) {
    return (
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-12">
        <div className="race-card p-6 border-neon-purple/20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-race-text tracking-widest text-sm">
              WELCOME, <span className="text-neon-purple">{driverName.toUpperCase()}</span>
            </h2>
          </div>
          <p className="text-race-dim font-mono text-xs">You haven't posted any lap times yet.</p>
          <Link href="/submit" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all" style={{ boxShadow: "0 0 20px rgba(184,79,255,0.3)" }}>
            POST YOUR FIRST LAP
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-race-text tracking-widest">
            YOUR PERFORMANCE
          </h2>
          <p className="text-race-dim font-mono text-xs tracking-widest">
            WELCOME BACK, <span className="text-neon-purple">{driverName.toUpperCase()}</span>
          </p>
        </div>
        <Link href={`/driver/${driverSlug}`} className="flex items-center gap-1 text-xs font-mono text-neon-purple hover:underline">
          FULL PROFILE <ChevronRight size={12} />
        </Link>
      </div>

      {/* Streak danger banner */}
      {streak.isInDanger && (
        <StreakSaveBanner
          streakBeforeBreak={streak.streakBeforeBreak}
          shields={streak.shields}
        />
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="race-card p-4 text-center">
          <Timer size={16} className="text-neon-purple mx-auto mb-1.5" />
          <p className="font-display font-black text-2xl text-race-text">{totalLaps}</p>
          <p className="text-race-dim text-xs font-mono mt-0.5">LAPS LOGGED</p>
        </div>
        <div className="race-card p-4 text-center">
          <Trophy size={16} className="text-neon-purple mx-auto mb-1.5" />
          <p className="font-display font-black text-2xl text-race-text">{pbMap.size}</p>
          <p className="text-race-dim text-xs font-mono mt-0.5">COMBOS</p>
        </div>
        <div className="race-card p-4 text-center">
          <Zap size={16} className="text-neon-purple mx-auto mb-1.5" />
          <p className="lap-time-display text-lg leading-tight">
            {overallBest ? formatLapTime(overallBest.lap_time_ms) : "—"}
          </p>
          <p className="text-race-dim text-xs font-mono mt-0.5">BEST LAP</p>
        </div>
        <StreakDisplay current={streak.current} longest={streak.longest} shields={streak.shields} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent laps */}
        <div className="race-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-label">YOUR RECENT LAPS</h3>
            <Link href="/submit" className="text-xs font-mono text-neon-purple hover:underline flex items-center gap-1">
              + ADD LAP
            </Link>
          </div>
          <div className="space-y-2">
            {recentLaps.map((lap) => (
              <div key={lap.id} className="flex items-center gap-3 p-3 rounded-lg bg-race-dark border border-race-border hover:border-neon-purple/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-race-text text-xs font-mono font-bold truncate">
                    {(lap.cars as any)?.name}
                  </p>
                  <p className="text-race-dim text-xs font-mono truncate">
                    {(lap.tracks as any)?.name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="lap-time-display text-sm">{lap.lap_time_formatted}</p>
                  <p className="text-race-dim/60 text-xs font-mono">{formatRelativeTime(lap.submitted_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal bests */}
        <div className="race-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-label">YOUR PERSONAL BESTS</h3>
            <TrendingDown size={14} className="text-neon-green" />
          </div>
          {pbs.length === 0 ? (
            <p className="text-race-dim font-mono text-xs text-center py-6">NO LAPS YET</p>
          ) : (
            <div className="space-y-2">
              {pbs.map((pb, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-race-dark border border-race-border hover:border-neon-green/20 transition-colors">
                  <div className={`w-5 h-5 rounded flex items-center justify-center font-display font-black text-xs flex-shrink-0 ${
                    i === 0 ? "text-neon-purple" : "text-race-dim"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-race-text text-xs font-mono font-bold truncate">{pb.carName}</p>
                    <p className="text-race-dim text-xs font-mono truncate">{pb.trackName}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`font-mono font-bold text-sm ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                      {formatLapTime(pb.bestMs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

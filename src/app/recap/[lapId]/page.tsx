import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/utils/lapTime";
import { getStreakInfo } from "@/lib/supabase/queries";
import { Trophy, Zap, Flame, ArrowRight, Flag, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";

interface RecapPageProps {
  params: Promise<{ lapId: string }>;
}

async function getRecapData(lapId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the submitted lap
  const { data: lap } = await supabase
    .from("lap_times")
    .select("*, cars(id, name, class), tracks(id, name, country), users(id, driver_name, team_name)")
    .eq("id", lapId)
    .single();

  if (!lap || lap.driver_id !== user.id) return null;

  const car   = lap.cars as any;
  const track = lap.tracks as any;
  const driver = lap.users as any;

  // Previous personal best on this combo (laps submitted BEFORE this one)
  const { data: prevBests } = await supabase
    .from("lap_times")
    .select("lap_time_ms, lap_time_formatted")
    .eq("driver_id", user.id)
    .eq("car_id", car.id)
    .eq("track_id", track.id)
    .lt("submitted_at", lap.submitted_at)
    .order("lap_time_ms", { ascending: true })
    .limit(1);

  const prevBest = prevBests?.[0] ?? null;
  const isFirstOnCombo = !prevBest;
  const deltaMs = prevBest ? lap.lap_time_ms - prevBest.lap_time_ms : null;
  const isNewPB = deltaMs !== null && deltaMs < 0;

  // Current leaderboard position for this combo (all drivers, best lap per driver)
  const { data: allOnCombo } = await supabase
    .from("lap_times")
    .select("driver_id, lap_time_ms")
    .eq("car_id", car.id)
    .eq("track_id", track.id)
    .order("lap_time_ms", { ascending: true });

  // Best per driver
  const bestMap = new Map<string, number>();
  for (const l of allOnCombo || []) {
    if (!bestMap.has(l.driver_id) || l.lap_time_ms < bestMap.get(l.driver_id)!) {
      bestMap.set(l.driver_id, l.lap_time_ms);
    }
  }
  const sorted = Array.from(bestMap.entries()).sort((a, b) => a[1] - b[1]);
  const position = sorted.findIndex(([id]) => id === user.id) + 1;
  const totalOnCombo = sorted.length;
  const p1Time = sorted[0]?.[1] ?? lap.lap_time_ms;
  const gapToP1Ms = lap.lap_time_ms - p1Time;

  // How many drivers did this beat?
  const beatenCount = sorted.filter(([id, t]) => id !== user.id && t > lap.lap_time_ms).length;

  // Streak
  const streak = await getStreakInfo(user.id);

  // Recent achievements (unlocked in the last 2 minutes)
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: newAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_key, unlocked_at, achievements(name, icon, tier)")
    .eq("user_id", user.id)
    .gte("unlocked_at", twoMinsAgo)
    .order("unlocked_at", { ascending: false });

  const driverSlug = driver.driver_name.toLowerCase().replace(/\s+/g, "-");

  return {
    lap, car, track, driver, driverSlug,
    prevBest, isFirstOnCombo, deltaMs, isNewPB,
    position, totalOnCombo, gapToP1Ms, beatenCount,
    streak,
    newAchievements: newAchievements || [],
  };
}

export default async function RecapPage({ params }: RecapPageProps) {
  const { lapId } = await params;
  const data = await getRecapData(lapId);
  if (!data) notFound();

  const {
    lap, car, track, driver, driverSlug,
    prevBest, isFirstOnCombo, deltaMs, isNewPB,
    position, totalOnCombo, gapToP1Ms, beatenCount,
    streak, newAchievements,
  } = data;

  const positionLabel =
    position === 1 ? "🥇 P1" :
    position === 2 ? "🥈 P2" :
    position === 3 ? "🥉 P3" :
    `P${position}`;

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-full mb-4">
            <Flag size={12} className="text-neon-green" />
            <span className="text-neon-green text-xs font-mono tracking-widest">LAP POSTED</span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl text-race-text tracking-wider mb-1">
            SESSION RECAP
          </h1>
          <p className="text-race-dim font-mono text-xs tracking-widest">
            {car.name.toUpperCase()} · {track.name.toUpperCase()}
          </p>
        </div>

        {/* Lap time hero */}
        <div className="race-card p-8 text-center mb-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.6), transparent)" }} />
          </div>
          <p className="section-label mb-3">YOUR TIME</p>
          <p className="lap-time-display text-6xl md:text-7xl mb-4">{lap.lap_time_formatted}</p>

          {/* Delta to previous PB */}
          {isFirstOnCombo ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 rounded-full">
              <Zap size={12} className="text-neon-purple" />
              <span className="text-neon-purple text-xs font-mono font-bold">FIRST LAP ON THIS COMBO</span>
            </div>
          ) : isNewPB ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 border border-neon-green/20 rounded-full">
              <TrendingDown size={12} className="text-neon-green" />
              <span className="text-neon-green text-xs font-mono font-bold">
                NEW PB — {(Math.abs(deltaMs!) / 1000).toFixed(3)}s FASTER
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-race-muted border border-race-border rounded-full">
              <TrendingUp size={12} className="text-race-dim" />
              <span className="text-race-dim text-xs font-mono">
                +{(deltaMs! / 1000).toFixed(3)}s vs PB ({prevBest!.lap_time_formatted})
              </span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Position */}
          <div className="race-card p-4 text-center">
            <p className="section-label mb-2">POSITION</p>
            <p className="font-display font-black text-3xl text-race-text">{positionLabel}</p>
            <p className="text-race-dim text-xs font-mono mt-1">of {totalOnCombo}</p>
          </div>

          {/* Gap to P1 */}
          <div className="race-card p-4 text-center">
            <p className="section-label mb-2">GAP TO P1</p>
            {gapToP1Ms === 0 ? (
              <p className="font-display font-black text-2xl text-neon-green">LEADER</p>
            ) : (
              <p className="font-display font-black text-2xl text-race-text">
                +{(gapToP1Ms / 1000).toFixed(3)}s
              </p>
            )}
            <p className="text-race-dim text-xs font-mono mt-1">behind fastest</p>
          </div>

          {/* Streak */}
          <div className="race-card p-4 text-center">
            <p className="section-label mb-2">STREAK</p>
            <p className="font-display font-black text-3xl text-neon-purple">{streak.current}</p>
            <p className="text-race-dim text-xs font-mono mt-1">
              {streak.current === 1 ? "day" : "days"} in a row
            </p>
          </div>
        </div>

        {/* Beaten drivers */}
        {beatenCount > 0 && (
          <div className="race-card p-5 mb-4 border-neon-purple/20 bg-neon-purple/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-neon-purple" />
              </div>
              <div>
                <p className="font-display font-bold text-race-text tracking-wide">
                  YOU BEAT {beatenCount} {beatenCount === 1 ? "DRIVER" : "DRIVERS"}
                </p>
                <p className="text-race-dim text-xs font-mono">
                  Your time is faster than {beatenCount} other {beatenCount === 1 ? "driver" : "drivers"} on this combo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New achievements */}
        {newAchievements.length > 0 && (
          <div className="race-card p-5 mb-4 border-yellow-400/20 bg-yellow-400/5">
            <p className="section-label mb-3 text-yellow-400">🏆 ACHIEVEMENTS UNLOCKED</p>
            <div className="space-y-2">
              {newAchievements.map((a: any) => (
                <div key={a.achievement_key} className="flex items-center gap-3">
                  <span className="text-2xl">{(a.achievements as any)?.icon}</span>
                  <div>
                    <p className="font-mono font-bold text-race-text text-sm">{(a.achievements as any)?.name}</p>
                    <p className="text-yellow-400/60 text-xs font-mono capitalize">{(a.achievements as any)?.tier} tier</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Streak milestone callout */}
        {streak.current > 0 && streak.current % 7 === 0 && (
          <div className="race-card p-5 mb-4 border-orange-400/20 bg-orange-400/5">
            <div className="flex items-center gap-3">
              <Flame size={20} className="text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-display font-bold text-race-text tracking-wide">
                  {streak.current}-DAY STREAK MILESTONE!
                </p>
                <p className="text-race-dim text-xs font-mono">Keep it going — you've earned a streak shield</p>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
          <Link
            href="/submit"
            className="flex items-center justify-center gap-2 py-3 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
            style={{ boxShadow: "0 0 20px rgba(184,79,255,0.25)" }}
          >
            <Flag size={14} />SUBMIT ANOTHER
          </Link>
          <Link
            href={`/leaderboard?car=${lap.car_id}&track=${lap.track_id}`}
            className="flex items-center justify-center gap-2 py-3 bg-race-muted hover:bg-race-card border border-race-border text-race-text text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
          >
            <Trophy size={14} />THIS COMBO
          </Link>
          <Link
            href={`/driver/${driverSlug}`}
            className="flex items-center justify-center gap-2 py-3 bg-race-muted hover:bg-race-card border border-race-border text-race-text text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
          >
            <ArrowRight size={14} />MY PROFILE
          </Link>
        </div>

      </div>
    </div>
  );
}

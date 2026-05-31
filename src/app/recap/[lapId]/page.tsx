import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStreakInfo } from "@/lib/supabase/queries";
import { Trophy, Zap, Flame, ArrowRight, Flag, ChevronRight, TrendingDown, TrendingUp, Share2 } from "lucide-react";
import Link from "next/link";
import { ShareButton } from "@/components/ui/ShareButton";

interface RecapPageProps {
  params: Promise<{ lapId: string }>;
}

async function getRecapData(lapId: string, currentUserId: string | null) {
  const supabase = await createClient();

  const { data: lap } = await supabase
    .from("lap_times")
    .select("*, cars(id, name, class), tracks(id, name, country), users(id, driver_name, team_name)")
    .eq("id", lapId)
    .single();

  if (!lap) return null;

  const car    = lap.cars as any;
  const track  = lap.tracks as any;
  const driver = lap.users as any;
  const isOwner = currentUserId === lap.driver_id;

  // Previous personal best (before this lap's submitted_at)
  const { data: prevBests } = await supabase
    .from("lap_times")
    .select("lap_time_ms, lap_time_formatted")
    .eq("driver_id", lap.driver_id)
    .eq("car_id", car.id)
    .eq("track_id", track.id)
    .lt("submitted_at", lap.submitted_at)
    .order("lap_time_ms", { ascending: true })
    .limit(1);

  const prevBest     = prevBests?.[0] ?? null;
  const isFirstOnCombo = !prevBest;
  const deltaMs      = prevBest ? lap.lap_time_ms - prevBest.lap_time_ms : null;
  const isNewPB      = deltaMs !== null && deltaMs < 0;

  // Leaderboard position
  const { data: allOnCombo } = await supabase
    .from("lap_times")
    .select("driver_id, lap_time_ms")
    .eq("car_id", car.id)
    .eq("track_id", track.id)
    .neq("validation_status", "flagged")
    .order("lap_time_ms", { ascending: true });

  const bestMap = new Map<string, number>();
  for (const l of allOnCombo || []) {
    if (!bestMap.has(l.driver_id) || l.lap_time_ms < bestMap.get(l.driver_id)!) {
      bestMap.set(l.driver_id, l.lap_time_ms);
    }
  }
  const sorted       = Array.from(bestMap.entries()).sort((a, b) => a[1] - b[1]);
  const position     = sorted.findIndex(([id]) => id === lap.driver_id) + 1;
  const totalOnCombo = sorted.length;
  const p1Time       = sorted[0]?.[1] ?? lap.lap_time_ms;
  const gapToP1Ms    = lap.lap_time_ms - p1Time;
  const beatenCount  = sorted.filter(([id, t]) => id !== lap.driver_id && t > lap.lap_time_ms).length;

  // Owner-only data
  let streak = null;
  let newAchievements: any[] = [];
  if (isOwner) {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    [streak, { data: { data: newAchievements } }] = await Promise.all([
      getStreakInfo(lap.driver_id),
      supabase
        .from("user_achievements")
        .select("achievement_key, unlocked_at, achievements(name, icon, tier)")
        .eq("user_id", lap.driver_id)
        .gte("unlocked_at", twoMinsAgo)
        .order("unlocked_at", { ascending: false })
        .then((r) => ({ data: { data: r.data ?? [] } })),
    ]);
  }

  const driverSlug = driver.driver_name.toLowerCase().replace(/\s+/g, "-");

  return {
    lap, car, track, driver, driverSlug, isOwner,
    prevBest, isFirstOnCombo, deltaMs, isNewPB,
    position, totalOnCombo, gapToP1Ms, beatenCount,
    streak, newAchievements,
  };
}

export default async function RecapPage({ params }: RecapPageProps) {
  const { lapId } = await params;
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const data = await getRecapData(lapId, user?.id ?? null);
  if (!data) notFound();

  const {
    lap, car, track, driver, driverSlug, isOwner,
    prevBest, isFirstOnCombo, deltaMs, isNewPB,
    position, totalOnCombo, gapToP1Ms, beatenCount,
    streak, newAchievements,
  } = data;

  const positionLabel =
    position === 1 ? "🥇 P1" :
    position === 2 ? "🥈 P2" :
    position === 3 ? "🥉 P3" :
    `P${position}`;

  const shareUrl   = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/recap/${lapId}`;
  const shareTitle = `${driver.driver_name} — ${lap.lap_time_formatted} on ${car.name} at ${track.name} | APEX TIMING`;

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-full mb-4">
            <Flag size={12} className="text-neon-green" />
            <span className="text-neon-green text-xs font-mono tracking-widest">
              {isOwner ? "LAP POSTED" : "LAP RECAP"}
            </span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl text-race-text tracking-wider mb-1">
            {isOwner ? "SESSION RECAP" : driver.driver_name.toUpperCase()}
          </h1>
          <p className="text-race-dim font-mono text-xs tracking-widest">
            {car.name.toUpperCase()} · {track.name.toUpperCase()}
          </p>
          {!isOwner && (
            <Link
              href={`/driver/${driverSlug}`}
              className="inline-flex items-center gap-1 mt-2 text-xs font-mono text-neon-purple hover:underline"
            >
              VIEW FULL PROFILE <ChevronRight size={10} />
            </Link>
          )}
        </div>

        {/* Lap time hero */}
        <div className="race-card p-8 text-center mb-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.6), transparent)" }} />
          </div>
          <p className="section-label mb-3">LAP TIME</p>
          <p className="lap-time-display text-6xl md:text-7xl mb-4">{lap.lap_time_formatted}</p>

          {isOwner && (
            isFirstOnCombo ? (
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
            )
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="race-card p-4 text-center">
            <p className="section-label mb-2">POSITION</p>
            <p className="font-display font-black text-3xl text-race-text">{positionLabel}</p>
            <p className="text-race-dim text-xs font-mono mt-1">of {totalOnCombo}</p>
          </div>
          <div className="race-card p-4 text-center">
            <p className="section-label mb-2">GAP TO P1</p>
            {gapToP1Ms === 0 ? (
              <p className="font-display font-black text-2xl text-neon-green">LEADER</p>
            ) : (
              <p className="font-display font-black text-2xl text-race-text">+{(gapToP1Ms / 1000).toFixed(3)}s</p>
            )}
            <p className="text-race-dim text-xs font-mono mt-1">behind fastest</p>
          </div>
          {isOwner && streak ? (
            <div className="race-card p-4 text-center">
              <p className="section-label mb-2">STREAK</p>
              <p className="font-display font-black text-3xl text-neon-purple">{streak.current}</p>
              <p className="text-race-dim text-xs font-mono mt-1">{streak.current === 1 ? "day" : "days"} in a row</p>
            </div>
          ) : (
            <div className="race-card p-4 text-center">
              <p className="section-label mb-2">BEATEN</p>
              <p className="font-display font-black text-3xl text-neon-purple">{beatenCount}</p>
              <p className="text-race-dim text-xs font-mono mt-1">{beatenCount === 1 ? "driver" : "drivers"}</p>
            </div>
          )}
        </div>

        {/* Beaten drivers */}
        {isOwner && beatenCount > 0 && (
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
                  Faster than {beatenCount} other {beatenCount === 1 ? "driver" : "drivers"} on this combo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New achievements */}
        {isOwner && newAchievements && newAchievements.length > 0 && (
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

        {/* Streak milestone */}
        {isOwner && streak && streak.current > 0 && streak.current % 7 === 0 && (
          <div className="race-card p-5 mb-4 border-orange-400/20 bg-orange-400/5">
            <div className="flex items-center gap-3">
              <Flame size={20} className="text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-display font-bold text-race-text tracking-wide">{streak.current}-DAY STREAK MILESTONE!</p>
                <p className="text-race-dim text-xs font-mono">Keep it going — you've earned a streak shield</p>
              </div>
            </div>
          </div>
        )}

        {/* Share card */}
        <div className="race-card p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-race-text text-xs font-mono font-bold">SHARE THIS LAP</p>
            <p className="text-race-dim text-xs font-mono">Anyone with the link can view this recap</p>
          </div>
          <ShareButton url={shareUrl} title={shareTitle} />
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {isOwner ? (
            <>
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
            </>
          ) : (
            <>
              <Link
                href={`/driver/${driverSlug}`}
                className="flex items-center justify-center gap-2 py-3 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                style={{ boxShadow: "0 0 20px rgba(184,79,255,0.25)" }}
              >
                <ArrowRight size={14} />DRIVER PROFILE
              </Link>
              <Link
                href={`/leaderboard?car=${lap.car_id}&track=${lap.track_id}`}
                className="flex items-center justify-center gap-2 py-3 bg-race-muted hover:bg-race-card border border-race-border text-race-text text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                <Trophy size={14} />THIS COMBO
              </Link>
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 py-3 bg-race-muted hover:bg-race-card border border-race-border text-race-text text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                <Flag size={14} />JOIN & COMPETE
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

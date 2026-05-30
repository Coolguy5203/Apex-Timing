import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/utils/lapTime";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Trophy, Timer, Car, MapPin, Zap, Star, Calendar, ChevronLeft, Flag } from "lucide-react";

interface DriverPageProps {
  params: Promise<{ slug: string }>;
}

async function getDriverData(slug: string) {
  const supabase = await createClient();
  const driverName = decodeURIComponent(slug).replace(/-/g, " ");

  const { data: driver } = await supabase
    .from("users")
    .select("*")
    .ilike("driver_name", driverName)
    .single();

  if (!driver) return null;

  const { data: lapTimes } = await supabase
    .from("lap_times")
    .select(`id, lap_time_ms, lap_time_formatted, submitted_at, notes, cars(id, name, class), tracks(id, name, country)`)
    .eq("driver_id", driver.id)
    .order("submitted_at", { ascending: false });

  const allLaps = lapTimes || [];

  const pbMap = new Map<string, typeof allLaps[0]>();
  for (const lap of [...allLaps].sort((a, b) => a.lap_time_ms - b.lap_time_ms)) {
    const key = `${(lap.cars as any).id}-${(lap.tracks as any).id}`;
    if (!pbMap.has(key)) pbMap.set(key, lap);
  }
  const personalBests = Array.from(pbMap.values()).sort((a, b) => a.lap_time_ms - b.lap_time_ms);

  const totalLaps = allLaps.length;
  const uniqueCars = new Set(allLaps.map((l) => (l.cars as any).id)).size;
  const uniqueTracks = new Set(allLaps.map((l) => (l.tracks as any).id)).size;
  const overallBest = allLaps.reduce((best, lap) => !best || lap.lap_time_ms < best.lap_time_ms ? lap : best, null as any);

  const carCounts = new Map<string, { name: string; count: number }>();
  for (const lap of allLaps) {
    const car = lap.cars as any;
    const existing = carCounts.get(car.id);
    if (existing) existing.count++;
    else carCounts.set(car.id, { name: car.name, count: 1 });
  }
  const favouriteCar = Array.from(carCounts.values()).sort((a, b) => b.count - a.count)[0];

  const trackCounts = new Map<string, { name: string; count: number }>();
  for (const lap of allLaps) {
    const track = lap.tracks as any;
    const existing = trackCounts.get(track.id);
    if (existing) existing.count++;
    else trackCounts.set(track.id, { name: track.name, count: 1 });
  }
  const favouriteTrack = Array.from(trackCounts.values()).sort((a, b) => b.count - a.count)[0];

  const pbsWithRank = await Promise.all(
    personalBests.map(async (pb) => {
      const car = pb.cars as any;
      const track = pb.tracks as any;
      const { data: faster } = await supabase
        .from("lap_times")
        .select("driver_id")
        .eq("car_id", car.id)
        .eq("track_id", track.id)
        .lt("lap_time_ms", pb.lap_time_ms);
      const uniqueFasterDrivers = new Set((faster || []).map((f) => f.driver_id)).size;
      const { data: p1Data } = await supabase
        .from("lap_times")
        .select("lap_time_ms")
        .eq("car_id", car.id)
        .eq("track_id", track.id)
        .order("lap_time_ms", { ascending: true })
        .limit(1)
        .single();
      return { ...pb, rank: uniqueFasterDrivers + 1, gap_to_p1_ms: pb.lap_time_ms - (p1Data?.lap_time_ms || pb.lap_time_ms) };
    })
  );

  return {
    driver, allLaps,
    personalBests: pbsWithRank,
    recentActivity: allLaps.slice(0, 8),
    stats: { totalLaps, uniqueCars, uniqueTracks, overallBest, favouriteCar, favouriteTrack },
  };
}

export default async function DriverPage({ params }: DriverPageProps) {
  const { slug } = await params;
  const data = await getDriverData(slug);
  if (!data) notFound();
  const { driver, personalBests, recentActivity, stats } = data;

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono mb-6 transition-colors">
          <ChevronLeft size={14} />BACK TO LEADERBOARD
        </Link>

        <div className="race-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.6), transparent)" }} />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-black text-4xl text-neon-purple">{driver.driver_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display font-black text-4xl md:text-5xl text-race-text tracking-wider">{driver.driver_name.toUpperCase()}</h1>
                {driver.is_pro && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700" }}>
                    <Star size={10} />PRO
                  </span>
                )}
              </div>
              {driver.team_name && <div className="mb-3"><Badge variant="muted" size="md">{driver.team_name.toUpperCase()}</Badge></div>}
              <div className="flex flex-wrap gap-4 text-xs font-mono text-race-dim">
                <span className="flex items-center gap-1"><Calendar size={11} />JOINED {new Date(driver.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</span>
                {stats.totalLaps > 0 && <span className="flex items-center gap-1"><Timer size={11} />LAST ACTIVE {formatRelativeTime(data.allLaps[0]?.submitted_at || driver.created_at)}</span>}
              </div>
            </div>
            {stats.overallBest && (
              <div className="text-right flex-shrink-0">
                <p className="section-label mb-1">PERSONAL BEST</p>
                <p className="lap-time-display text-3xl md:text-4xl">{stats.overallBest.lap_time_formatted}</p>
                <p className="text-race-dim text-xs font-mono mt-1">{(stats.overallBest.cars as any)?.name} · {(stats.overallBest.tracks as any)?.name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "TOTAL LAPS", value: stats.totalLaps, icon: Flag, color: "text-gradient-purple" },
            { label: "CARS DRIVEN", value: stats.uniqueCars, icon: Car, color: "text-gradient-purple" },
            { label: "TRACKS RUN", value: stats.uniqueTracks, icon: MapPin, color: "text-neon-green" },
            { label: "TRACK BESTS", value: personalBests.length, icon: Trophy, color: "text-neon-green" },
          ].map((stat) => (
            <div key={stat.label} className="race-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="section-label mb-2">{stat.label}</p>
                  <p className={`font-display font-black text-3xl md:text-4xl ${stat.color}`}>{stat.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center">
                  <stat.icon size={16} className="text-neon-purple" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {(stats.favouriteCar || stats.favouriteTrack) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {stats.favouriteCar && (
              <div className="race-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0"><Car size={18} className="text-neon-purple" /></div>
                <div>
                  <p className="section-label mb-1">FAVOURITE CAR</p>
                  <p className="font-display font-bold text-race-text tracking-wide">{stats.favouriteCar.name}</p>
                  <p className="text-race-dim text-xs font-mono">{stats.favouriteCar.count} LAP{stats.favouriteCar.count !== 1 ? "S" : ""} POSTED</p>
                </div>
              </div>
            )}
            {stats.favouriteTrack && (
              <div className="race-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neon-green-glow border border-neon-green/20 flex items-center justify-center flex-shrink-0"><MapPin size={18} className="text-neon-green" /></div>
                <div>
                  <p className="section-label mb-1">FAVOURITE CIRCUIT</p>
                  <p className="font-display font-bold text-race-text tracking-wide">{stats.favouriteTrack.name}</p>
                  <p className="text-race-dim text-xs font-mono">{stats.favouriteTrack.count} LAP{stats.favouriteTrack.count !== 1 ? "S" : ""} POSTED</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 race-card overflow-hidden">
            <div className="p-6 pb-0">
              <SectionHeader title="TRACK RECORDS" subtitle="Personal best per car & circuit" icon={Trophy} />
            </div>
            {personalBests.length === 0 ? (
              <div className="p-6 text-center py-12"><p className="text-race-dim font-mono text-sm">NO LAPS POSTED YET</p></div>
            ) : (
              <div>
                <div className="grid grid-cols-[auto_1fr_auto_auto] border-b border-race-border bg-race-dark px-6 py-3">
                  {["POS", "CAR · CIRCUIT", "GAP", "TIME"].map((col) => (
                    <div key={col} className="text-xs font-mono text-race-dim tracking-widest">{col}</div>
                  ))}
                </div>
                {personalBests.map((pb) => {
                  const car = pb.cars as any;
                  const track = pb.tracks as any;
                  const isFirst = pb.rank === 1;
                  return (
                    <div key={`${car.id}-${track.id}`} className="grid grid-cols-[auto_1fr_auto_auto] border-b border-race-border/40 items-center px-6 py-3 hover:bg-race-muted/20 transition-colors" style={isFirst ? { borderLeft: "2px solid #b84fff" } : {}}>
                      <div className="w-10">
                        <span className={`font-display font-black text-xl ${pb.rank === 1 ? "text-neon-purple" : pb.rank === 2 ? "text-lap-silver" : pb.rank === 3 ? "text-lap-bronze" : "text-race-dim"}`}>
                          {pb.rank === 1 ? <Zap size={16} className="text-neon-purple" /> : pb.rank}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isFirst && <Zap size={11} className="text-neon-purple flex-shrink-0" />}
                          <p className="text-race-text text-sm font-mono font-bold truncate">{car.name}</p>
                        </div>
                        <p className="text-race-dim text-xs font-mono truncate flex items-center gap-1"><MapPin size={9} />{track.name}</p>
                      </div>
                      <div className="px-4 text-right">
                        <span className={`font-mono text-sm ${pb.gap_to_p1_ms === 0 ? "text-neon-green" : "text-race-dim"}`}>
                          {pb.gap_to_p1_ms === 0 ? "P1 🏆" : `+${(pb.gap_to_p1_ms / 1000).toFixed(3)}s`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${isFirst ? "text-neon-purple" : "text-race-text"}`}>{pb.lap_time_formatted}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="race-card p-6">
            <SectionHeader title="RECENT LAPS" subtitle="Latest submissions" icon={Timer} />
            {recentActivity.length === 0 ? (
              <p className="text-race-dim font-mono text-sm text-center py-8">NO LAPS YET</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((lap) => {
                  const car = lap.cars as any;
                  const track = lap.tracks as any;
                  return (
                    <div key={lap.id} className="pb-3 border-b border-race-border/50 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-race-text text-xs font-mono font-bold truncate">{car.name}</p>
                          <p className="text-race-dim text-xs font-mono flex items-center gap-1 mt-0.5"><MapPin size={9} /><span className="truncate">{track.name}</span></p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-neon-purple text-sm font-mono font-bold">{lap.lap_time_formatted}</p>
                          <p className="text-race-dim text-xs font-mono">{formatRelativeTime(lap.submitted_at)}</p>
                        </div>
                      </div>
                      {lap.notes && <p className="text-race-dim/60 text-xs font-mono mt-1 italic truncate">"{lap.notes}"</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { Users, Trophy, Timer, Car, MapPin, Activity, Calendar, ChevronLeft, Star, Zap } from "lucide-react";
import Link from "next/link";
import { getActiveSeason, getTeamChampionshipStandings } from "@/lib/supabase/queries";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicTeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const teamName = decodeURIComponent(slug).replace(/-/g, " ");

  const supabase = await createClient();

  // Load drivers on this team
  const { data: drivers } = await supabase
    .from("users")
    .select("id, driver_name, team_name, team_rank, is_pro, created_at, h2h_wins, total_points")
    .ilike("team_name", teamName)
    .order("created_at", { ascending: true });

  if (!drivers || drivers.length === 0) notFound();

  const driverIds = drivers.map((d) => d.id);
  const resolvedTeamName = drivers[0].team_name!;

  // Load all laps for the team
  const { data: rawLaps } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, driver_id,
      users(driver_name),
      cars(id, name, class),
      tracks(id, name, country)
    `)
    .in("driver_id", driverIds)
    .neq("validation_status", "flagged")
    .order("submitted_at", { ascending: false });

  const allLaps = rawLaps || [];

  // Per-driver stats
  const driverStats = drivers.map((driver) => {
    const driverLaps = allLaps.filter((l) => l.driver_id === driver.id);
    const bestLap = driverLaps.reduce(
      (best, lap) => (!best || lap.lap_time_ms < best.lap_time_ms ? lap : best),
      null as any
    );
    return { ...driver, lapCount: driverLaps.length, bestLap, lastActive: driverLaps[0]?.submitted_at ?? driver.created_at };
  }).sort((a, b) => b.lapCount - a.lapCount);

  // Overall best per car+track combo (team record)
  const comboMap = new Map<string, { carName: string; trackName: string; bestMs: number; bestFormatted: string; driverName: string }>();
  for (const lap of [...allLaps].sort((a, b) => a.lap_time_ms - b.lap_time_ms)) {
    const car = lap.cars as any;
    const track = lap.tracks as any;
    const key = `${car.id}__${track.id}`;
    if (!comboMap.has(key)) {
      comboMap.set(key, {
        carName: car.name,
        trackName: track.name,
        bestMs: lap.lap_time_ms,
        bestFormatted: lap.lap_time_formatted,
        driverName: (lap.users as any)?.driver_name ?? "?",
      });
    }
  }
  const teamRecords = Array.from(comboMap.values()).sort((a, b) => a.bestMs - b.bestMs).slice(0, 10);

  const overallBest = allLaps.reduce(
    (best, lap) => (!best || lap.lap_time_ms < best.lap_time_ms ? lap : best),
    null as any
  );
  const totalPoints = drivers.reduce((sum, d) => sum + (d.total_points ?? 0), 0);

  // Championship info
  const activeSeason = await getActiveSeason();
  const champData = activeSeason ? await getTeamChampionshipStandings(activeSeason.id) : null;
  const champEntry = champData?.teamStandings.find((t) => t.team_name.toLowerCase() === resolvedTeamName.toLowerCase());

  const recentActivity = allLaps.slice(0, 12);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <Link href="/teams" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono transition-colors mb-6">
          <ChevronLeft size={14} />ALL TEAMS
        </Link>

        {/* Hero */}
        <div className="race-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.6), transparent)" }} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-black text-4xl text-neon-purple">{resolvedTeamName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="font-display font-black text-4xl md:text-5xl text-race-text tracking-wider mb-2">{resolvedTeamName.toUpperCase()}</h1>
              <div className="flex flex-wrap gap-3 text-xs font-mono text-race-dim">
                <span className="flex items-center gap-1"><Users size={11} />{driverStats.length} DRIVER{driverStats.length !== 1 ? "S" : ""}</span>
                <span className="flex items-center gap-1"><Timer size={11} />{allLaps.length} LAPS</span>
                {activeSeason && champEntry && (
                  <span className="flex items-center gap-1 text-neon-purple"><Zap size={11} />P{champEntry.rank} IN {activeSeason.name.toUpperCase()}</span>
                )}
              </div>
            </div>
            {overallBest && (
              <div className="text-right flex-shrink-0">
                <p className="section-label mb-1">TEAM BEST</p>
                <p className="lap-time-display text-3xl">{overallBest.lap_time_formatted}</p>
                <p className="text-race-dim text-xs font-mono mt-1">
                  {(overallBest.cars as any)?.name} · {(overallBest.tracks as any)?.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "DRIVERS", value: driverStats.length, color: "text-gradient-purple" },
            { label: "TOTAL LAPS", value: allLaps.length, color: "text-gradient-purple" },
            { label: "TRACK RECORDS", value: teamRecords.length, color: "text-neon-green" },
            { label: "TEAM POINTS", value: totalPoints, color: totalPoints > 0 ? "text-neon-purple" : "text-race-dim" },
          ].map((s) => (
            <div key={s.label} className="race-card p-5">
              <p className="section-label mb-2">{s.label}</p>
              <p className={`font-display font-black text-4xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Championship banner */}
        {activeSeason && champEntry && (
          <div className="race-card p-5 mb-8 border-neon-purple/30 bg-neon-purple/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Star size={16} className="text-neon-purple" />
                <div>
                  <p className="font-display font-bold text-race-text tracking-widest">{activeSeason.name}</p>
                  <p className="text-race-dim text-xs font-mono">
                    P{champEntry.rank} · {champEntry.points} PTS · {champEntry.wins} WIN{champEntry.wins !== 1 ? "S" : ""}
                  </p>
                </div>
              </div>
              <Link href="/championship" className="text-xs font-mono text-neon-purple hover:underline">
                VIEW STANDINGS →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Roster */}
          <div className="lg:col-span-2 race-card overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="font-display font-bold text-race-text tracking-widest flex items-center gap-2 text-sm">
                <Users size={15} className="text-neon-purple" />DRIVER ROSTER
              </h2>
            </div>
            <div className="divide-y divide-race-border/50">
              {driverStats.map((driver, i) => (
                <div key={driver.id} className="px-6 py-4 flex items-center gap-4 hover:bg-race-muted/20 transition-colors">
                  <span className={`font-display font-black text-xl w-6 text-center ${i === 0 ? "text-neon-purple" : "text-race-dim"}`}>{i + 1}</span>
                  <div className="w-9 h-9 rounded-xl bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-black text-neon-purple text-sm">{driver.driver_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/driver/${encodeURIComponent(driver.driver_name.toLowerCase().replace(/\s+/g, "-"))}`}
                      className="font-display font-bold text-race-text tracking-wide hover:text-neon-purple transition-colors"
                    >
                      {driver.driver_name.toUpperCase()}
                    </Link>
                    <div className="flex items-center gap-3 text-race-dim text-xs font-mono mt-0.5">
                      <span>{driver.lapCount} LAP{driver.lapCount !== 1 ? "S" : ""}</span>
                      {driver.h2h_wins > 0 && <span>{driver.h2h_wins} H2H WIN{driver.h2h_wins !== 1 ? "S" : ""}</span>}
                      {(driver.total_points ?? 0) > 0 && <span className="text-neon-purple">{driver.total_points} PTS</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {driver.bestLap ? (
                      <>
                        <p className={`font-mono font-bold text-sm ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                          {driver.bestLap.lap_time_formatted}
                        </p>
                        <p className="text-race-dim text-xs font-mono">{formatRelativeTime(driver.lastActive)}</p>
                      </>
                    ) : (
                      <p className="text-race-dim text-xs font-mono">NO LAPS</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Team Records */}
            <div className="race-card p-6">
              <h2 className="font-display font-bold text-race-text tracking-widest flex items-center gap-2 text-sm mb-4">
                <Trophy size={15} className="text-neon-purple" />TEAM RECORDS
              </h2>
              {teamRecords.length === 0 ? (
                <p className="text-race-dim font-mono text-xs text-center py-4">NO LAPS YET</p>
              ) : (
                <div className="space-y-2">
                  {teamRecords.slice(0, 6).map((rec, i) => (
                    <div key={`${rec.carName}${rec.trackName}`} className="flex items-center gap-3 p-2 rounded hover:bg-race-muted transition-colors">
                      <span className={`font-display font-black text-lg w-5 text-center ${i === 0 ? "text-neon-purple" : "text-race-dim"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-race-text text-xs font-mono font-bold truncate">{rec.carName}</p>
                        <div className="flex items-center gap-1 text-race-dim text-xs font-mono">
                          <MapPin size={8} /><span className="truncate">{rec.trackName}</span>
                        </div>
                        <p className="text-race-dim/70 text-[10px] font-mono">{rec.driverName.toUpperCase()}</p>
                      </div>
                      <span className={`font-mono font-bold text-sm flex-shrink-0 ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                        {rec.bestFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="race-card p-6">
              <h2 className="font-display font-bold text-race-text tracking-widest flex items-center gap-2 text-sm mb-4">
                <Activity size={15} className="text-neon-purple" />TEAM FEED
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-race-dim font-mono text-xs text-center py-4">NO ACTIVITY</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((lap) => (
                    <div key={lap.id} className="flex items-start gap-3 pb-3 border-b border-race-border/50 last:border-0 last:pb-0">
                      <div className="w-7 h-7 rounded bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="font-display font-black text-neon-purple text-xs">
                          {(lap.users as any)?.driver_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-race-text text-xs font-mono font-bold">{(lap.users as any)?.driver_name?.toUpperCase()}</p>
                        <div className="flex items-center gap-1 text-race-dim text-xs font-mono mt-0.5">
                          <Car size={9} /><span className="truncate">{(lap.cars as any)?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-race-dim text-xs font-mono">
                          <MapPin size={9} /><span className="truncate">{(lap.tracks as any)?.name}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-neon-purple text-xs font-mono font-bold">{lap.lap_time_formatted}</p>
                        <p className="text-race-dim text-xs font-mono">{formatRelativeTime(lap.submitted_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

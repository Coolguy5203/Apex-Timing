import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime, formatGap } from "@/utils/lapTime";
import { MapPin, Zap, Flag, ChevronLeft, ShieldCheck, Users, Car } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface TrackPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TrackPageProps) {
  const { slug } = await params;
  const trackName = decodeURIComponent(slug).replace(/-/g, " ");
  return {
    title: `${trackName} | APEX TIMING`,
    description: `All-time lap records and history at ${trackName}`,
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Look up track by slug (name-based)
  const trackName = decodeURIComponent(slug).replace(/-/g, " ");
  const { data: track } = await supabase
    .from("tracks")
    .select("*")
    .ilike("name", trackName)
    .maybeSingle();

  if (!track) notFound();

  // All valid laps at this track
  const { data: allLaps } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, validation_status,
      users(id, driver_name, driver_slug, team_name),
      cars(id, name, class)
    `)
    .eq("track_id", track.id)
    .neq("validation_status", "flagged")
    .order("lap_time_ms", { ascending: true });

  const laps = allLaps ?? [];

  // Best lap per car (track records by car)
  const carRecordMap = new Map<string, typeof laps[0]>();
  for (const lap of laps) {
    const carId = (lap.cars as any)?.id;
    if (carId && !carRecordMap.has(carId)) carRecordMap.set(carId, lap);
  }
  const carRecords = Array.from(carRecordMap.values()).sort((a, b) => a.lap_time_ms - b.lap_time_ms);

  // Overall fastest
  const overallFastest = laps[0];

  // Unique drivers and cars
  const uniqueDrivers = new Set(laps.map((l) => (l.users as any)?.id)).size;
  const uniqueCars = new Set(laps.map((l) => (l.cars as any)?.id)).size;

  // Recent activity (last 8 unique driver submissions)
  const recentMap = new Map<string, typeof laps[0]>();
  const recentByTime = [...laps].sort((a, b) =>
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  for (const lap of recentByTime) {
    if (recentMap.size >= 8) break;
    const key = `${(lap.users as any)?.id}-${(lap.cars as any)?.id}`;
    if (!recentMap.has(key)) recentMap.set(key, lap);
  }
  const recent = Array.from(recentMap.values());

  const trackSlug = track.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/records" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono transition-colors mb-6">
          <ChevronLeft size={14} />CIRCUIT RECORDS
        </Link>

        {/* Hero */}
        <div className="race-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.4), transparent)" }} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <MapPin size={28} className="text-neon-purple" />
            </div>
            <div className="flex-1">
              <h1 className="font-display font-black text-4xl md:text-5xl text-race-text tracking-wider mb-1">
                {track.name.toUpperCase()}
              </h1>
              {track.country && (
                <p className="text-race-dim font-mono text-sm tracking-widest mb-3">{track.country}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs font-mono text-race-dim">
                <span className="flex items-center gap-1"><Users size={11} />{uniqueDrivers} DRIVER{uniqueDrivers !== 1 ? "S" : ""}</span>
                <span className="flex items-center gap-1"><Car size={11} />{uniqueCars} CAR{uniqueCars !== 1 ? "S" : ""}</span>
                <span className="flex items-center gap-1"><Flag size={11} />{laps.length} LAP{laps.length !== 1 ? "S" : ""} TOTAL</span>
              </div>
            </div>
            {overallFastest && (
              <div className="text-right flex-shrink-0">
                <p className="section-label mb-1">ALL-TIME RECORD</p>
                <p className="lap-time-display text-3xl">{overallFastest.lap_time_formatted}</p>
                <Link
                  href={`/driver/${(overallFastest.users as any)?.driver_slug ?? (overallFastest.users as any)?.driver_name?.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-race-dim text-xs font-mono hover:text-neon-purple transition-colors mt-1 block"
                >
                  {(overallFastest.users as any)?.driver_name?.toUpperCase()} · {(overallFastest.cars as any)?.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {laps.length === 0 ? (
          <div className="race-card p-16 text-center">
            <MapPin size={40} className="text-race-dim/20 mx-auto mb-4" />
            <p className="font-display font-bold text-race-text tracking-widest mb-2">NO LAPS YET</p>
            <p className="text-race-dim text-xs font-mono mb-6">Be the first to post a time at {track.name}</p>
            <Link href={`/submit?track=${track.id}`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all">
              SUBMIT A LAP
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Records by car */}
            <div className="lg:col-span-2 race-card overflow-hidden">
              <div className="p-5 pb-0 flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-race-text tracking-widest text-sm">RECORDS BY CAR</p>
                  <p className="text-race-dim text-xs font-mono mt-0.5">Fastest ever lap per car class</p>
                </div>
                <Link
                  href={`/submit?track=${track.id}`}
                  className="text-xs font-mono text-neon-purple hover:underline flex-shrink-0"
                >
                  SUBMIT LAP ↗
                </Link>
              </div>

              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 px-5 py-3 mt-3 bg-race-dark border-y border-race-border text-xs font-mono text-race-dim tracking-widest">
                <div className="w-8">#</div>
                <div>DRIVER · CAR</div>
                <div className="text-right pr-6">GAP</div>
                <div className="text-right">TIME</div>
              </div>

              {carRecords.map((record, index) => {
                const driver = record.users as any;
                const car = record.cars as any;
                const driverSlug = driver?.driver_slug ?? driver?.driver_name?.toLowerCase().replace(/\s+/g, "-");
                const gapMs = record.lap_time_ms - (carRecords[0]?.lap_time_ms ?? 0);
                const isVerified = record.validation_status === "approved";

                return (
                  <div
                    key={car.id}
                    className={clsx(
                      "grid grid-cols-[auto_1fr_auto_auto] gap-0 border-b border-race-border/40 last:border-0 items-center px-5 py-3 hover:bg-race-muted/20 transition-colors",
                      index === 0 && "border-l-2 border-l-neon-purple"
                    )}
                  >
                    <div className="w-8">
                      <span className={clsx("font-display font-black text-lg", index === 0 ? "text-neon-purple" : index === 1 ? "text-lap-silver" : index === 2 ? "text-lap-bronze" : "text-race-dim")}>
                        {index === 0 ? <Zap size={14} className="text-neon-purple" /> : index + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/driver/${driverSlug}`} className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide truncate block">
                        {driver?.driver_name?.toUpperCase()}
                      </Link>
                      <p className="text-race-dim text-xs font-mono truncate">{car.name}{car.class ? ` · ${car.class}` : ""}</p>
                    </div>
                    <div className="pr-6 text-right">
                      <span className={clsx("font-mono text-sm", gapMs === 0 ? "text-neon-green" : "text-race-dim")}>
                        {gapMs === 0 ? "FASTEST" : `+${(gapMs / 1000).toFixed(3)}s`}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isVerified && <ShieldCheck size={11} className="text-neon-green" />}
                        <Link href={`/recap/${record.id}`} className={clsx("font-mono font-bold hover:underline", index === 0 ? "lap-time-fastest text-lg" : "text-race-text")}>
                          {record.lap_time_formatted}
                        </Link>
                      </div>
                      <p className="text-race-dim/50 text-[10px] font-mono">{formatRelativeTime(record.submitted_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <div className="race-card p-6">
              <p className="font-display font-bold text-race-text tracking-widest text-sm mb-1">RECENT ACTIVITY</p>
              <p className="text-race-dim text-xs font-mono mb-4">Latest submissions at this circuit</p>
              <div className="space-y-3">
                {recent.map((lap) => {
                  const driver = lap.users as any;
                  const car = lap.cars as any;
                  const driverSlug = driver?.driver_slug ?? driver?.driver_name?.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <div key={lap.id} className="pb-3 border-b border-race-border/50 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/driver/${driverSlug}`} className="text-race-text text-xs font-mono font-bold truncate hover:text-neon-purple transition-colors block">
                            {driver?.driver_name?.toUpperCase()}
                          </Link>
                          <p className="text-race-dim text-xs font-mono truncate mt-0.5">{car?.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-neon-purple text-sm font-mono font-bold">{lap.lap_time_formatted}</p>
                          <p className="text-race-dim/60 text-xs font-mono">{formatRelativeTime(lap.submitted_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

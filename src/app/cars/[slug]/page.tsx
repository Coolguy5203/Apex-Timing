import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { Car, ChevronLeft, Zap, Users, Flag, MapPin, Trophy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CarXray } from "@/components/cars/CarXray";
import { computeCarStats } from "@/lib/carStats";

interface CarPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CarPageProps) {
  const { slug } = await params;
  const carName = decodeURIComponent(slug).replace(/-/g, " ");
  return {
    title: `${carName} | APEX TIMING`,
    description: `Stats, records, and technical xray for the ${carName}`,
  };
}

export default async function CarPage({ params }: CarPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const carName = decodeURIComponent(slug).replace(/-/g, " ");

  const { data: car } = await supabase
    .from("cars")
    .select("*")
    .ilike("name", carName)
    .maybeSingle();

  if (!car) notFound();

  // All laps for this car
  const { data: allLapsRaw } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, validation_status,
      users(id, driver_name, driver_slug, team_name),
      tracks(id, name, country)
    `)
    .eq("car_id", car.id)
    .order("lap_time_ms", { ascending: true });

  const allLaps = allLapsRaw ?? [];
  const validLaps = allLaps.filter(l => l.validation_status !== "flagged");
  const lapTimesMs = validLaps.map(l => l.lap_time_ms);

  // Stats for rating computation
  const uniqueDriverIds = new Set(allLaps.map(l => (l.users as any)?.id)).size;
  const uniqueTrackIds  = new Set(validLaps.map(l => (l.tracks as any)?.id)).size;

  // Class comparisons (max lap count + drivers across all cars in same class)
  const { data: classCars } = await supabase
    .from("cars")
    .select("id")
    .eq("class", car.class);

  const classCarIds = (classCars ?? []).map(c => c.id);

  const { data: classLapStats } = await supabase
    .from("lap_times")
    .select("car_id, driver_id")
    .in("car_id", classCarIds.length > 0 ? classCarIds : [car.id])
    .neq("validation_status", "flagged");

  // max laps and drivers for any car in the class
  const lapCountByCar = new Map<string, number>();
  const driversByCar  = new Map<string, Set<string>>();
  for (const l of classLapStats ?? []) {
    lapCountByCar.set(l.car_id, (lapCountByCar.get(l.car_id) ?? 0) + 1);
    if (!driversByCar.has(l.car_id)) driversByCar.set(l.car_id, new Set());
    driversByCar.get(l.car_id)!.add(l.driver_id);
  }
  const maxLapsClass    = Math.max(1, ...Array.from(lapCountByCar.values()));
  const maxDriversClass = Math.max(1, ...Array.from(driversByCar.values()).map(s => s.size));

  // Total track count
  const { count: totalTracks } = await supabase
    .from("tracks")
    .select("id", { count: "exact", head: true });

  const stats = computeCarStats(
    car.class,
    validLaps.length,
    maxLapsClass,
    uniqueDriverIds,
    maxDriversClass,
    validLaps.length,
    lapTimesMs,
    uniqueTrackIds,
    totalTracks ?? 100,
  );

  // Top 5 drivers for this car (by best lap time)
  const driverBestMap = new Map<string, { name: string; slug: string; team?: string; best: number; bestFormatted: string }>();
  for (const lap of validLaps) {
    const u = lap.users as any;
    if (!u) continue;
    const existing = driverBestMap.get(u.id);
    if (!existing || lap.lap_time_ms < existing.best) {
      driverBestMap.set(u.id, {
        name: u.driver_name,
        slug: u.driver_slug ?? u.driver_name.toLowerCase().replace(/\s+/g, "-"),
        team: u.team_name,
        best: lap.lap_time_ms,
        bestFormatted: lap.lap_time_formatted,
      });
    }
  }
  const topDrivers = Array.from(driverBestMap.values())
    .sort((a, b) => a.best - b.best)
    .slice(0, 8);

  // Track breakdown (best lap per track for this car)
  const trackBestMap = new Map<string, { name: string; best: number; bestFormatted: string; driverName: string; lapId: string }>();
  for (const lap of validLaps) {
    const t = lap.tracks as any;
    const u = lap.users as any;
    if (!t) continue;
    const existing = trackBestMap.get(t.id);
    if (!existing || lap.lap_time_ms < existing.best) {
      trackBestMap.set(t.id, {
        name: t.name,
        best: lap.lap_time_ms,
        bestFormatted: lap.lap_time_formatted,
        driverName: u?.driver_name ?? "—",
        lapId: lap.id,
      });
    }
  }
  const trackBests = Array.from(trackBestMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  // Recent submissions (newest first)
  const recent = [...allLaps]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 6);

  const overallFastest = validLaps[0];

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/cars" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono transition-colors mb-6">
          <ChevronLeft size={14} />ALL CARS
        </Link>

        {/* Hero */}
        <div className="race-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.5), transparent)" }} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center flex-shrink-0">
              <Car size={28} className="text-neon-purple" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display font-black text-3xl md:text-4xl text-race-text tracking-wider">
                  {car.name.toUpperCase()}
                </h1>
                <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-neon-purple/10 border border-neon-purple/30 text-neon-purple">
                  {car.class}
                </span>
                {car.is_pro && (
                  <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                    ⚡ PRO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-race-dim">
                <span className="flex items-center gap-1"><Users size={11} />{uniqueDriverIds} DRIVER{uniqueDriverIds !== 1 ? "S" : ""}</span>
                <span className="flex items-center gap-1"><Flag size={11} />{allLaps.length} SUBMISSION{allLaps.length !== 1 ? "S" : ""}</span>
                <span className="flex items-center gap-1"><MapPin size={11} />{uniqueTrackIds} TRACK{uniqueTrackIds !== 1 ? "S" : ""}</span>
              </div>
            </div>
            {overallFastest && (
              <div className="text-right flex-shrink-0">
                <p className="section-label mb-1">FASTEST EVER</p>
                <p className="lap-time-display text-3xl">{overallFastest.lap_time_formatted}</p>
                <Link
                  href={`/driver/${(overallFastest.users as any)?.driver_slug ?? (overallFastest.users as any)?.driver_name?.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-race-dim text-xs font-mono hover:text-neon-purple transition-colors mt-1 block"
                >
                  {(overallFastest.users as any)?.driver_name?.toUpperCase()} · {(overallFastest.tracks as any)?.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* X-RAY */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-neon-purple rounded-full" />
            <h2 className="font-display font-bold text-race-text tracking-widest">TECHNICAL X-RAY</h2>
            <span className="text-race-dim text-xs font-mono ml-1">COMPONENT ANALYSIS</span>
          </div>
          <CarXray stats={stats} carName={car.name} carClass={car.class} />
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top Drivers */}
          <div className="lg:col-span-2 race-card overflow-hidden">
            <div className="p-5 pb-0 flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-race-text tracking-widest text-sm">TOP DRIVERS</p>
                <p className="text-race-dim text-xs font-mono mt-0.5">Best lap per driver on this car</p>
              </div>
              <Link href={`/submit?car=${car.id}`} className="text-xs font-mono text-neon-purple hover:underline">
                SUBMIT LAP ↗
              </Link>
            </div>
            {topDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-race-dim font-mono text-sm">NO LAPS YET</p>
                <p className="text-race-dim/60 text-xs font-mono mt-1">Be the first to post a time</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 px-5 py-3 mt-3 bg-race-dark border-y border-race-border text-xs font-mono text-race-dim tracking-widest">
                  <div className="w-8">#</div>
                  <div>DRIVER</div>
                  <div className="text-right pr-4">BEAT THIS</div>
                  <div className="text-right">BEST LAP</div>
                </div>
                {topDrivers.map((driver, i) => (
                  <div key={driver.slug} className={`grid grid-cols-[auto_1fr_auto_auto] gap-0 border-b border-race-border/40 last:border-0 items-center px-5 py-3 hover:bg-race-muted/20 transition-colors ${i === 0 ? "border-l-2 border-l-neon-purple" : ""}`}>
                    <div className="w-8">
                      <span className={`font-display font-black text-lg ${i === 0 ? "text-neon-purple" : i === 1 ? "text-lap-silver" : i === 2 ? "text-lap-bronze" : "text-race-dim"}`}>
                        {i === 0 ? <Zap size={14} className="text-neon-purple" /> : i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/driver/${driver.slug}`} className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide">
                        {driver.name.toUpperCase()}
                      </Link>
                      {driver.team && <p className="text-race-dim/60 text-xs font-mono">{driver.team}</p>}
                    </div>
                    <div className="pr-4 text-right">
                      <Link href={`/submit?car=${car.id}`} className="text-[10px] font-mono text-race-dim/40 hover:text-neon-purple transition-colors">
                        BEAT ↗
                      </Link>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                        {driver.bestFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Track Records for this car */}
          <div className="race-card p-5">
            <p className="font-display font-bold text-race-text tracking-widest text-sm mb-1">TRACK RECORDS</p>
            <p className="text-race-dim text-xs font-mono mb-4">Fastest at each circuit</p>
            {trackBests.length === 0 ? (
              <p className="text-race-dim/60 font-mono text-xs text-center py-8">NO DATA</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {trackBests.map((t) => (
                  <div key={t.name} className="flex items-start justify-between gap-2 pb-3 border-b border-race-border/50 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <Link
                        href={`/tracks/${t.name.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-race-text text-xs font-mono font-bold truncate hover:text-neon-purple transition-colors block"
                      >
                        {t.name}
                      </Link>
                      <p className="text-race-dim/60 text-[10px] font-mono mt-0.5">{t.driverName.toUpperCase()}</p>
                    </div>
                    <Link href={`/recap/${t.lapId}`} className="text-neon-purple text-sm font-mono font-bold hover:underline flex-shrink-0">
                      {t.bestFormatted}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

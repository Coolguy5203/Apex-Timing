import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { Flag, MapPin, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function RecordsPage() {
  const supabase = await createClient();

  // Fetch the fastest lap at each track (across all cars) — exclude flagged
  const { data: allLaps } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, validation_status,
      users(driver_name, driver_slug, team_name),
      cars(name, class),
      tracks(id, name, country)
    `)
    .neq("validation_status", "flagged")
    .order("lap_time_ms", { ascending: true });

  // One record per track: first entry per track_id (already sorted fastest first)
  const trackRecordMap = new Map<string, typeof allLaps extends (infer T)[] | null ? T : never>();
  for (const lap of allLaps ?? []) {
    const trackId = (lap.tracks as any)?.id;
    if (trackId && !trackRecordMap.has(trackId)) {
      trackRecordMap.set(trackId, lap);
    }
  }

  const records = Array.from(trackRecordMap.values()).sort((a, b) =>
    ((a.tracks as any)?.name ?? "").localeCompare((b.tracks as any)?.name ?? "")
  );

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Flag size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">CIRCUIT RECORDS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">FASTEST EVER LAP AT EACH TRACK · ALL CARS</p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="race-card p-16 text-center">
            <Flag size={40} className="text-race-dim/20 mx-auto mb-4" />
            <p className="text-race-dim font-mono text-sm">NO RECORDS YET — BE THE FIRST TO POST A TIME.</p>
          </div>
        ) : (
          <div className="race-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_auto_auto_auto] gap-0 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
              <div>CIRCUIT</div>
              <div className="hidden md:block text-right pr-8">DRIVER</div>
              <div className="text-right pr-8">CAR</div>
              <div className="text-right">TIME</div>
            </div>

            {records.map((record, index) => {
              const track = record.tracks as any;
              const car = record.cars as any;
              const driver = record.users as any;
              const driverSlug = driver?.driver_slug || driver?.driver_name?.toLowerCase().replace(/\s+/g, "-");
              const isVerified = record.validation_status === "approved";

              return (
                <div
                  key={track.id}
                  className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_auto_auto_auto] gap-0 border-b border-race-border/50 last:border-0 items-center hover:bg-race-muted/20 transition-colors"
                  style={index === 0 ? { borderLeft: "2px solid #b84fff" } : {}}
                >
                  {/* Circuit */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Zap size={12} className="text-neon-purple flex-shrink-0" />}
                      <Link
                        href={`/tracks/${track.name.toLowerCase().replace(/\s+/g, "-")}`}
                        className="font-display font-bold text-race-text tracking-wide text-sm hover:text-neon-purple transition-colors"
                      >
                        {track.name}
                      </Link>
                    </div>
                    {track.country && (
                      <p className="text-race-dim/60 text-xs font-mono flex items-center gap-1 mt-0.5">
                        <MapPin size={9} />{track.country}
                      </p>
                    )}
                  </div>

                  {/* Driver */}
                  <div className="hidden md:block px-5 py-4 text-right">
                    <Link
                      href={`/driver/${driverSlug}`}
                      className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide"
                    >
                      {driver?.driver_name?.toUpperCase() ?? "—"}
                    </Link>
                    {driver?.team_name && (
                      <p className="text-race-dim/60 text-xs font-mono mt-0.5">{driver.team_name}</p>
                    )}
                  </div>

                  {/* Car */}
                  <div className="px-5 py-4 text-right">
                    <p className="text-race-dim text-sm font-mono">{car?.name}</p>
                    {car?.class && <p className="text-race-dim/50 text-[10px] font-mono mt-0.5">{car.class}</p>}
                  </div>

                  {/* Time */}
                  <div className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isVerified && <ShieldCheck size={11} className="text-neon-green" title="Admin verified" />}
                      <Link
                        href={`/recap/${record.id}`}
                        className={`font-mono font-bold text-base hover:underline transition-colors ${index === 0 ? "lap-time-fastest text-lg" : "text-race-text"}`}
                      >
                        {record.lap_time_formatted}
                      </Link>
                    </div>
                    <p className="text-race-dim/50 text-[10px] font-mono mt-0.5">{formatRelativeTime(record.submitted_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-race-dim/40 text-xs font-mono text-center mt-6">
          {records.length} circuit{records.length !== 1 ? "s" : ""} tracked · Updated in real-time
        </p>
      </div>
    </div>
  );
}

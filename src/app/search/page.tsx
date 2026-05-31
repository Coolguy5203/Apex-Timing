import { createClient } from "@/lib/supabase/server";
import { Search, Users, Timer, Trophy, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatLapTime } from "@/utils/lapTime";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();

  let results: any[] = [];

  if (query.length >= 1) {
    const { data: drivers } = await supabase
      .from("users")
      .select("id, driver_name, team_name, created_at, total_points, h2h_wins")
      .ilike("driver_name", `%${query}%`)
      .order("driver_name")
      .limit(30);

    if (drivers && drivers.length > 0) {
      const ids = drivers.map((d) => d.id);

      // Lap counts + best lap per driver in one query
      const { data: laps } = await supabase
        .from("lap_times")
        .select("driver_id, lap_time_ms, lap_time_formatted")
        .in("driver_id", ids)
        .neq("validation_status", "flagged")
        .order("lap_time_ms", { ascending: true });

      const lapCountMap = new Map<string, number>();
      const bestLapMap = new Map<string, { ms: number; formatted: string }>();
      for (const lap of laps ?? []) {
        lapCountMap.set(lap.driver_id, (lapCountMap.get(lap.driver_id) ?? 0) + 1);
        if (!bestLapMap.has(lap.driver_id)) {
          bestLapMap.set(lap.driver_id, { ms: lap.lap_time_ms, formatted: lap.lap_time_formatted });
        }
      }

      results = drivers.map((d) => ({
        ...d,
        lap_count: lapCountMap.get(d.id) ?? 0,
        best_lap: bestLapMap.get(d.id) ?? null,
        slug: d.driver_name.toLowerCase().replace(/\s+/g, "-"),
      }));
    }
  }

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Search size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">SEARCH</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">FIND A DRIVER</p>
          </div>
        </div>

        {/* Search form */}
        <form method="GET" action="/search" className="mb-8">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by driver name..."
              autoFocus
              autoComplete="off"
              className="w-full pl-11 pr-4 py-3.5 bg-race-card border border-race-border hover:border-neon-purple/30 focus:border-neon-purple/50 rounded-xl text-race-text font-mono text-sm placeholder-race-dim/50 outline-none transition-colors"
            />
            {query && (
              <Link
                href="/search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-race-dim hover:text-race-text transition-colors"
              >
                ✕
              </Link>
            )}
          </div>
        </form>

        {/* Results */}
        {query.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-race-dim/30 mx-auto mb-4" />
            <p className="text-race-dim font-mono text-sm">TYPE A NAME TO SEARCH FOR DRIVERS</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} className="text-race-dim/30 mx-auto mb-4" />
            <p className="text-race-dim font-mono text-sm">NO DRIVERS FOUND FOR "{query.toUpperCase()}"</p>
            <p className="text-race-dim/50 font-mono text-xs mt-2">Try a different name or check the spelling</p>
          </div>
        ) : (
          <div>
            <p className="text-race-dim text-xs font-mono tracking-widest mb-4">
              {results.length} RESULT{results.length !== 1 ? "S" : ""} FOR "{query.toUpperCase()}"
            </p>
            <div className="space-y-2">
              {results.map((driver) => (
                <Link
                  key={driver.id}
                  href={`/driver/${driver.slug}`}
                  className="race-card p-4 flex items-center gap-4 hover:border-neon-purple/30 hover:bg-neon-purple/5 transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-black text-neon-purple text-lg">
                      {driver.driver_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-race-text tracking-wide group-hover:text-neon-purple transition-colors">
                      {driver.driver_name.toUpperCase()}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {driver.team_name && (
                        <span className="text-race-dim text-xs font-mono">{driver.team_name}</span>
                      )}
                      <span className="flex items-center gap-1 text-race-dim text-xs font-mono">
                        <Timer size={10} />{driver.lap_count} LAP{driver.lap_count !== 1 ? "S" : ""}
                      </span>
                      {driver.h2h_wins > 0 && (
                        <span className="flex items-center gap-1 text-race-dim text-xs font-mono">
                          <Trophy size={10} />{driver.h2h_wins} H2H WIN{driver.h2h_wins !== 1 ? "S" : ""}
                        </span>
                      )}
                      {(driver.total_points ?? 0) > 0 && (
                        <span className="text-neon-purple text-xs font-mono font-bold">{driver.total_points} PTS</span>
                      )}
                    </div>
                  </div>

                  {/* Best lap */}
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    {driver.best_lap && (
                      <div>
                        <p className="text-race-dim text-[10px] font-mono tracking-widest">BEST</p>
                        <p className="font-mono font-bold text-race-text text-sm">{driver.best_lap.formatted}</p>
                      </div>
                    )}
                    <ChevronRight size={14} className="text-race-dim group-hover:text-neon-purple transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { getActiveSeason, getAllSeasons, getChampionshipStandings } from "@/lib/supabase/queries";
import { Trophy, Zap, Star, Medal, Calendar, Users, ChevronLeft, Crown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface PageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function ChampionshipPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;
  const [activeSeason, allSeasons] = await Promise.all([getActiveSeason(), getAllSeasons()]);

  // Which season to display: URL param > active > most recent
  let displaySeasonId: string | null = seasonParam ?? activeSeason?.id ?? allSeasons[0]?.id ?? null;
  const { season, standings } = displaySeasonId
    ? await getChampionshipStandings(displaySeasonId)
    : { season: null, standings: [] };

  const pastSeasons = allSeasons.filter((s) => s.id !== season?.id);
  const isViewingHistory = !!seasonParam && seasonParam !== activeSeason?.id;
  const champion = standings[0] ?? null;

  const rankStyle = (rank: number) => {
    if (rank === 1) return "text-neon-purple";
    if (rank === 2) return "text-lap-silver";
    if (rank === 3) return "text-lap-bronze";
    return "text-race-dim";
  };

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back to live when viewing history */}
        {isViewingHistory && activeSeason && (
          <Link href="/championship" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono transition-colors mb-6">
            <ChevronLeft size={14} />BACK TO LIVE STANDINGS
          </Link>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">CHAMPIONSHIP</h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">
                {isViewingHistory ? "HISTORICAL STANDINGS" : "F1-STYLE POINTS STANDINGS"}
              </p>
            </div>
          </div>
        </div>

        {!season ? (
          <div className="race-card p-12 text-center">
            <Trophy size={48} className="text-race-dim mx-auto mb-4" />
            <h3 className="font-display font-bold text-xl text-race-text mb-2">NO ACTIVE SEASON</h3>
            <p className="text-race-dim font-mono text-sm">An admin needs to create a season to start tracking championship points.</p>
          </div>
        ) : (
          <>
            {/* Season info */}
            <div className="race-card p-6 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(184,79,255,0.6), transparent)" }} />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-display font-black text-2xl text-race-text tracking-wider">{season.name.toUpperCase()}</h2>
                    {season.is_active ? (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">LIVE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-race-muted text-race-dim border border-race-border">COMPLETED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-race-dim text-xs font-mono">
                    <Calendar size={11} />
                    {formatDate(season.start_date)} — {formatDate(season.end_date)}
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="section-label mb-1">DRIVERS</p>
                    <p className="font-display font-black text-2xl text-neon-purple">{standings.length}</p>
                  </div>
                  <div>
                    <p className="section-label mb-1">{season.is_active ? "LEADER" : "CHAMPION"}</p>
                    <p className="font-display font-bold text-lg text-race-text truncate max-w-[140px]">
                      {standings[0]?.driverName.toUpperCase() ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Champion highlight (completed seasons only) */}
            {!season.is_active && champion && (
              <div className="race-card p-6 mb-6 border-yellow-400/30 bg-yellow-400/5 relative overflow-hidden">
                <div className="absolute top-3 right-4 opacity-10">
                  <Crown size={80} className="text-yellow-400" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border-2 border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-black text-3xl text-yellow-400">{champion.driverName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-yellow-400/70 text-xs font-mono tracking-widest mb-0.5">🏆 {season.name.toUpperCase()} CHAMPION</p>
                    <Link
                      href={`/driver/${encodeURIComponent(champion.driverName.toLowerCase().replace(/\s+/g, "-"))}`}
                      className="font-display font-black text-3xl text-race-text hover:text-yellow-400 transition-colors tracking-wider"
                    >
                      {champion.driverName.toUpperCase()}
                    </Link>
                    {champion.teamName && (
                      <p className="text-race-dim text-xs font-mono mt-1">{champion.teamName.toUpperCase()}</p>
                    )}
                  </div>
                  <div className="ml-auto text-right hidden sm:block">
                    <p className="font-display font-black text-5xl text-yellow-400">{champion.points}</p>
                    <p className="text-yellow-400/60 text-xs font-mono">POINTS</p>
                    <p className="text-race-dim text-xs font-mono mt-1">{champion.wins} WIN{champion.wins !== 1 ? "S" : ""} · {champion.podiums} PODIUM{champion.podiums !== 1 ? "S" : ""}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Points key (live only) */}
            {season.is_active && (
              <div className="flex flex-wrap gap-2 mb-6">
                {F1_POINTS.map((pts, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-race-card border border-race-border rounded text-xs font-mono">
                    <span className={rankStyle(i + 1)}>P{i + 1}</span>
                    <span className="text-race-dim">=</span>
                    <span className="text-race-text font-bold">{pts}pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Standings table */}
            {standings.length === 0 ? (
              <div className="race-card p-12 text-center">
                <p className="text-race-dim font-mono text-sm">NO LAPS SUBMITTED IN THIS SEASON WINDOW YET</p>
              </div>
            ) : (
              <div className="race-card overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] border-b border-race-border bg-race-dark px-4 py-3">
                  {["POS", "DRIVER", "TEAM", "WINS", "PODIUMS", "PTS"].map((col, i) => (
                    <div key={col} className={`text-xs font-mono text-race-dim tracking-widest ${i >= 2 ? "px-4 text-right" : ""} ${i === 2 ? "hidden md:block" : ""}`}>{col}</div>
                  ))}
                </div>
                {standings.map((entry, index) => (
                  <div
                    key={entry.driverName}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] border-b border-race-border/40 items-center px-4 py-3.5 hover:bg-race-muted/20 transition-colors ${index === 0 ? "bg-neon-purple/5 border-l-2 border-l-neon-purple" : ""}`}
                  >
                    <div className="w-10">
                      <span className={`font-display font-black text-xl ${rankStyle(entry.rank)}`}>
                        {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/driver/${encodeURIComponent(entry.driverName.toLowerCase().replace(/\s+/g, "-"))}`}
                        className="font-display font-bold text-race-text tracking-wide hover:text-neon-purple transition-colors"
                      >
                        {entry.driverName.toUpperCase()}
                      </Link>
                    </div>
                    <div className="hidden md:block px-4 text-right">
                      {entry.teamName ? (
                        <Badge variant="muted" size="sm">{entry.teamName.toUpperCase()}</Badge>
                      ) : (
                        <span className="text-race-dim/40 text-xs font-mono">—</span>
                      )}
                    </div>
                    <div className="px-4 text-right">
                      <span className="font-mono text-sm text-race-text">{entry.wins}</span>
                    </div>
                    <div className="px-4 text-right">
                      <span className="font-mono text-sm text-race-dim">{entry.podiums}</span>
                    </div>
                    <div className="px-4 text-right">
                      <span className={`font-display font-black text-xl ${index === 0 ? "text-neon-purple" : "text-race-text"}`}>{entry.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Season history */}
            {allSeasons.length > 1 && (
              <div className="mt-10">
                <h3 className="section-label mb-4 flex items-center gap-2">
                  <Calendar size={12} />SEASON ARCHIVE
                </h3>
                <div className="space-y-2">
                  {allSeasons.map((s) => {
                    const isCurrent = s.id === season.id;
                    return (
                      <Link
                        key={s.id}
                        href={s.is_active ? "/championship" : `/championship?season=${s.id}`}
                        className={`race-card p-4 flex items-center justify-between hover:border-neon-purple/30 hover:bg-neon-purple/5 transition-all group ${isCurrent ? "border-neon-purple/30 bg-neon-purple/5" : ""}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-display font-bold tracking-wide ${isCurrent ? "text-neon-purple" : "text-race-text group-hover:text-neon-purple transition-colors"}`}>
                              {s.name.toUpperCase()}
                            </p>
                            {s.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">LIVE</span>
                            )}
                            {isCurrent && !s.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-purple/10 text-neon-purple border border-neon-purple/20">VIEWING</span>
                            )}
                          </div>
                          <p className="text-race-dim text-xs font-mono">{formatDate(s.start_date)} — {formatDate(s.end_date)}</p>
                        </div>
                        {!s.is_active && !isCurrent && (
                          <span className="text-xs font-mono text-race-dim group-hover:text-neon-purple transition-colors">VIEW RESULTS →</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { getActiveSeason, getAllSeasons, getChampionshipStandings } from "@/lib/supabase/queries";
import { Trophy, Zap, Star, Medal, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ChampionshipPage() {
  const [activeSeason, allSeasons] = await Promise.all([getActiveSeason(), getAllSeasons()]);

  const displaySeason = activeSeason ?? allSeasons[0] ?? null;
  const { season, standings } = displaySeason
    ? await getChampionshipStandings(displaySeason.id)
    : { season: null, standings: [] };

  const rankStyle = (rank: number) => {
    if (rank === 1) return "text-neon-purple";
    if (rank === 2) return "text-lap-silver";
    if (rank === 3) return "text-lap-bronze";
    return "text-race-dim";
  };

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">CHAMPIONSHIP</h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">F1-STYLE POINTS STANDINGS</p>
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
                    {season.is_active && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">LIVE</span>
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
                    <p className="section-label mb-1">LEADER</p>
                    <p className="font-display font-bold text-lg text-race-text truncate max-w-[140px]">
                      {standings[0]?.driverName.toUpperCase() ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Points key */}
            <div className="flex flex-wrap gap-2 mb-6">
              {F1_POINTS.map((pts, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-race-card border border-race-border rounded text-xs font-mono">
                  <span className={rankStyle(i + 1)}>P{i + 1}</span>
                  <span className="text-race-dim">=</span>
                  <span className="text-race-text font-bold">{pts}pts</span>
                </div>
              ))}
            </div>

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

            {/* Past seasons */}
            {allSeasons.filter(s => s.id !== season.id).length > 0 && (
              <div className="mt-10">
                <h3 className="section-label mb-4">PAST SEASONS</h3>
                <div className="space-y-2">
                  {allSeasons.filter(s => s.id !== season.id).map(s => (
                    <div key={s.id} className="race-card p-4 flex items-center justify-between">
                      <div>
                        <p className="font-display font-bold text-race-text tracking-wide">{s.name}</p>
                        <p className="text-race-dim text-xs font-mono">{formatDate(s.start_date)} — {formatDate(s.end_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

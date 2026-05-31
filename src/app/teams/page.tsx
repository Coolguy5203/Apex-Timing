import { createClient } from "@/lib/supabase/server";
import { getTeamStandings, getTeamChampionshipStandings, getActiveSeason } from "@/lib/supabase/queries";
import { Users, Trophy, Timer, Medal, Zap, Star, ChevronRight } from "lucide-react";
import { formatLapTime } from "@/utils/lapTime";
import Link from "next/link";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [teamStandings, activeSeason] = await Promise.all([
    getTeamStandings(),
    getActiveSeason(),
  ]);

  const teamChampionship = activeSeason
    ? await getTeamChampionshipStandings(activeSeason.id)
    : null;

  // Merge championship points into team standings
  const champMap = new Map(
    (teamChampionship?.teamStandings || []).map((t) => [t.team_name, t])
  );

  const merged = teamStandings.map((team) => ({
    ...team,
    champ_points: champMap.get(team.team_name)?.points ?? 0,
    champ_wins: champMap.get(team.team_name)?.wins ?? 0,
    champ_podiums: champMap.get(team.team_name)?.podiums ?? 0,
    champ_rank: champMap.get(team.team_name)?.rank ?? null,
  })).sort((a, b) => b.champ_points - a.champ_points || b.total_laps - a.total_laps);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">TEAM STANDINGS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">ALL TEAMS · COMBINED PERFORMANCE</p>
          </div>
          {user && (
            <Link href="/team" className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple text-xs font-mono font-bold tracking-widest rounded-lg transition-all ml-auto">
              MY TEAM <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {/* Active season championship banner */}
        {activeSeason && (
          <div className="race-card p-5 mb-8 border-neon-purple/30 bg-neon-purple/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Star size={18} className="text-neon-purple" />
                <div>
                  <p className="font-display font-bold text-race-text tracking-widest">{activeSeason.name}</p>
                  <p className="text-race-dim text-xs font-mono">ACTIVE TEAM CHAMPIONSHIP · F1 SCORING PER DRIVER</p>
                </div>
              </div>
              <Link href="/championship" className="text-xs font-mono text-neon-purple hover:underline flex items-center gap-1">
                DRIVER STANDINGS →
              </Link>
            </div>
          </div>
        )}

        {teamStandings.length === 0 ? (
          <div className="race-card p-12 text-center">
            <Users size={40} className="text-race-dim mx-auto mb-4" />
            <p className="font-display font-bold text-race-text tracking-widest mb-2">NO TEAMS YET</p>
            <p className="text-race-dim font-mono text-sm">Teams appear here once drivers register with a team name.</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-2 mb-2">
              {["POS", "TEAM", "DRIVERS", "LAPS", "TEAM BEST", activeSeason ? "POINTS" : ""].map((col, i) => (
                <div key={i} className="text-xs font-mono text-race-dim tracking-widest text-right first:text-left">{col}</div>
              ))}
            </div>

            <div className="space-y-3">
              {merged.map((team, index) => {
                const rank = index + 1;
                const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
                return (
                  <Link
                    key={team.team_name}
                    href={`/teams/${encodeURIComponent(team.team_name.toLowerCase().replace(/\s+/g, "-"))}`}
                    className="race-card p-5 flex flex-col md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto] md:gap-4 md:items-center hover:border-neon-purple/30 hover:bg-neon-purple/5 transition-all block group"
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-3 md:block mb-3 md:mb-0">
                      {rank <= 3 ? (
                        <Medal size={20} className={medalColors[rank - 1]} />
                      ) : (
                        <span className="font-display font-black text-xl text-race-dim w-5 text-center">{rank}</span>
                      )}
                    </div>

                    {/* Team name + drivers */}
                    <div className="flex-1 min-w-0 mb-3 md:mb-0">
                      <p className={`font-display font-bold text-lg tracking-wide group-hover:text-neon-purple transition-colors ${rank === 1 ? "text-neon-purple" : "text-race-text"}`}>
                        {team.team_name.toUpperCase()}
                      </p>
                    </div>

                    {/* Member count */}
                    <div className="text-right">
                      <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5 md:hidden">DRIVERS</p>
                      <div className="flex items-center justify-end gap-1 text-race-dim font-mono text-sm">
                        <Users size={12} />
                        {team.member_count}
                      </div>
                    </div>

                    {/* Total laps */}
                    <div className="text-right">
                      <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5 md:hidden">LAPS</p>
                      <div className="flex items-center justify-end gap-1 text-race-dim font-mono text-sm">
                        <Timer size={12} />
                        {team.total_laps}
                      </div>
                    </div>

                    {/* Team best lap */}
                    <div className="text-right">
                      <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5 md:hidden">BEST LAP</p>
                      <span className={`font-mono font-bold text-sm ${rank === 1 ? "text-neon-purple" : "text-race-text"}`}>
                        {team.best_lap_formatted || "—"}
                      </span>
                    </div>

                    {/* Championship points */}
                    {activeSeason && (
                      <div className="text-right">
                        <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5 md:hidden">POINTS</p>
                        <div className="flex items-center justify-end gap-1">
                          <Zap size={12} className="text-neon-purple" />
                          <span className={`font-display font-bold text-lg ${team.champ_points > 0 ? "text-neon-purple" : "text-race-dim"}`}>
                            {team.champ_points}
                          </span>
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Team championship breakdown */}
            {activeSeason && teamChampionship && teamChampionship.teamStandings.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display font-bold text-race-text tracking-widest mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-neon-purple" />
                  TEAM CHAMPIONSHIP — {activeSeason.name}
                </h2>
                <div className="race-card overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] border-b border-race-border bg-race-dark px-5 py-3">
                    {["POS", "TEAM", "WINS", "PODIUMS", "PTS"].map((col) => (
                      <div key={col} className="text-xs font-mono text-race-dim tracking-widest text-right first:text-left">{col}</div>
                    ))}
                  </div>
                  {teamChampionship.teamStandings.map((team, i) => (
                    <div key={team.team_name} className="grid grid-cols-[auto_1fr_auto_auto_auto] border-b border-race-border/40 items-center px-5 py-3 hover:bg-race-muted/20 transition-colors last:border-0">
                      <div className="w-8">
                        {i < 3 ? (
                          <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                        ) : (
                          <span className="font-display font-black text-race-dim">{i + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className={`font-display font-bold tracking-wide ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                          {team.team_name.toUpperCase()}
                        </p>
                        <p className="text-race-dim text-xs font-mono">{team.memberCount} driver{team.memberCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right font-mono text-race-dim">{team.wins}</div>
                      <div className="text-right font-mono text-race-dim">{team.podiums}</div>
                      <div className="text-right">
                        <span className={`font-display font-bold text-xl ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>{team.points}</span>
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

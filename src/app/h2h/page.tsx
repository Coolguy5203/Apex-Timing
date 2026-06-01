import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/utils/lapTime";
import { Swords, Trophy, Clock, CheckCircle2, XCircle, Minus, Star, Calendar } from "lucide-react";
import Link from "next/link";

async function getH2HData(userId: string | null) {
  const supabase = await createClient();

  // All events, newest first
  const { data: events } = await supabase
    .from("h2h_events")
    .select("*, cars(name), tracks(name)")
    .order("start_date", { ascending: false });

  // Active event matchups (all, for the standings table)
  const activeEvent = (events || []).find((e) => e.status === "active" || e.status === "completed");

  let myMatchup: any = null;
  let activeMatchups: any[] = [];

  if (activeEvent) {
    const { data: matchups } = await supabase
      .from("h2h_matchups")
      .select(`
        *,
        driver_a:users!h2h_matchups_driver_a_id_fkey(id, driver_name, team_name),
        driver_b:users!h2h_matchups_driver_b_id_fkey(id, driver_name, team_name),
        winner:users!h2h_matchups_winner_id_fkey(id, driver_name),
        cars(name), tracks(name)
      `)
      .eq("event_id", activeEvent.id)
      .order("created_at");

    activeMatchups = matchups || [];
    if (userId) {
      myMatchup = activeMatchups.find(
        (m) => m.driver_a_id === userId || m.driver_b_id === userId
      ) ?? null;
    }
  }

  // All-time H2H leaderboard
  const { data: leaders } = await supabase
    .from("users")
    .select("id, driver_name, team_name, h2h_points, h2h_wins, h2h_matchups")
    .gt("h2h_points", 0)
    .order("h2h_points", { ascending: false })
    .limit(20);

  return { events: events || [], activeEvent, myMatchup, activeMatchups, leaders: leaders || [] };
}

function MatchupCard({ matchup, currentUserId }: { matchup: any; currentUserId: string | null }) {
  const driverA = matchup.driver_a as any;
  const driverB = matchup.driver_b as any;
  const isMyMatchup = currentUserId && (matchup.driver_a_id === currentUserId || matchup.driver_b_id === currentUserId);
  const winner = matchup.winner as any;

  const aWon = winner?.id === matchup.driver_a_id;
  const bWon = winner?.id === matchup.driver_b_id;

  const slugA = driverA?.driver_name?.toLowerCase().replace(/\s+/g, "-");
  const slugB = driverB?.driver_name?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`race-card overflow-hidden ${isMyMatchup ? "border-neon-purple/40 shadow-lg shadow-neon-purple/10" : ""}`}>
      {isMyMatchup && (
        <div className="px-4 py-1.5 bg-neon-purple/10 border-b border-neon-purple/20 text-center">
          <span className="text-neon-purple text-[10px] font-mono font-bold tracking-widest">YOUR MATCHUP</span>
        </div>
      )}
      <div className="p-4">
        {/* Car / Track */}
        {matchup.cars && matchup.tracks && (
          <p className="text-race-dim text-xs font-mono text-center mb-3">
            {(matchup.cars as any).name} · {(matchup.tracks as any).name}
          </p>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* Driver A */}
          <div className={`text-center p-3 rounded-lg ${aWon ? "bg-neon-green/10 border border-neon-green/20" : "bg-race-dark"}`}>
            <Link href={`/driver/${slugA}`} className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide block truncate">
              {driverA?.driver_name?.toUpperCase()}
            </Link>
            {matchup.finalized ? (
              matchup.driver_a_ms ? (
                <p className={`font-mono text-sm font-bold mt-1 ${aWon ? "text-neon-green" : "text-race-dim"}`}>
                  {formatLapTime(matchup.driver_a_ms)}
                </p>
              ) : (
                <p className="text-race-dim/40 text-xs font-mono mt-1">NO TIME</p>
              )
            ) : (
              <p className="text-race-dim/40 text-xs font-mono mt-1">PENDING</p>
            )}
            {aWon && <p className="text-neon-green text-[10px] font-mono font-bold mt-1">⚡ WINNER</p>}
          </div>

          {/* VS */}
          <div className="text-center">
            {matchup.finalized ? (
              winner ? (
                <Swords size={18} className="text-neon-purple mx-auto" />
              ) : (
                <Minus size={18} className="text-race-dim mx-auto" />
              )
            ) : (
              <span className="text-race-dim text-xs font-mono font-bold">VS</span>
            )}
          </div>

          {/* Driver B */}
          <div className={`text-center p-3 rounded-lg ${bWon ? "bg-neon-green/10 border border-neon-green/20" : "bg-race-dark"}`}>
            <Link href={`/driver/${slugB}`} className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide block truncate">
              {driverB?.driver_name?.toUpperCase()}
            </Link>
            {matchup.finalized ? (
              matchup.driver_b_ms ? (
                <p className={`font-mono text-sm font-bold mt-1 ${bWon ? "text-neon-green" : "text-race-dim"}`}>
                  {formatLapTime(matchup.driver_b_ms)}
                </p>
              ) : (
                <p className="text-race-dim/40 text-xs font-mono mt-1">NO TIME</p>
              )
            ) : (
              <p className="text-race-dim/40 text-xs font-mono mt-1">PENDING</p>
            )}
            {bWon && <p className="text-neon-green text-[10px] font-mono font-bold mt-1">⚡ WINNER</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function H2HPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { events, activeEvent, myMatchup, activeMatchups, leaders } = await getH2HData(user?.id ?? null);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Swords size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">HEAD-TO-HEAD</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">SKILL-MATCHED EVENTS · WIN POINTS</p>
          </div>
        </div>

        {/* No events yet */}
        {events.length === 0 && (
          <div className="race-card p-12 text-center">
            <Swords size={40} className="text-race-dim/20 mx-auto mb-4" />
            <p className="font-display font-bold text-race-text tracking-widest mb-1">NO EVENTS YET</p>
            <p className="text-race-dim text-xs font-mono">Admins create H2H events — check back soon.</p>
          </div>
        )}

        {/* Active event */}
        {activeEvent && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label flex items-center gap-2">
                {activeEvent.status === "active" && <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow inline-block" />}
                {activeEvent.status === "active" ? "ACTIVE EVENT" : "RECENT EVENT"}
              </h2>
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                activeEvent.status === "active"
                  ? "text-neon-green bg-neon-green/10 border-neon-green/30"
                  : "text-race-dim bg-race-muted border-race-border"
              }`}>
                {activeEvent.status.toUpperCase()}
              </span>
            </div>

            {/* Event card */}
            <div className="race-card p-5 mb-5 border-neon-purple/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-xl text-race-text tracking-wider mb-1">
                    {activeEvent.name.toUpperCase()}
                  </h3>
                  <p className="text-race-dim text-xs font-mono flex items-center gap-2">
                    <Calendar size={11} />
                    {activeEvent.start_date} → {activeEvent.end_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-neon-green font-display font-black text-3xl">+{activeEvent.points_win}</p>
                  <p className="text-race-dim text-xs font-mono">PTS FOR WIN</p>
                </div>
              </div>

              {/* How it works */}
              <div className="mt-4 pt-4 border-t border-race-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-race-dim">
                <div className="flex items-start gap-2">
                  <span className="text-neon-purple">01</span>
                  <span>The bot matched you with a driver at your skill level</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-purple">02</span>
                  <span>Post your best lap on the assigned car + circuit combo</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-purple">03</span>
                  <span>Fastest time wins {activeEvent.points_win} points when the event closes</span>
                </div>
              </div>
            </div>

            {/* My matchup highlight */}
            {myMatchup && (
              <div className="mb-5">
                <MatchupCard matchup={myMatchup} currentUserId={user?.id ?? null} />
                {myMatchup.car_id && myMatchup.track_id && activeEvent.status === "active" && (
                  <div className="mt-2 text-center">
                    <Link
                      href={`/submit?car=${myMatchup.car_id}&track=${myMatchup.track_id}&h2h=1`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                      style={{ boxShadow: "0 0 20px rgba(184,79,255,0.25)" }}
                    >
                      <Swords size={13} />SUBMIT YOUR LAP
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!myMatchup && user && activeEvent.status === "active" && (
              <div className="race-card p-5 mb-5 border-yellow-400/20 bg-yellow-400/5 text-center">
                <p className="text-yellow-400 text-xs font-mono">You weren't matched in this event — you need at least one lap time to be included next time.</p>
              </div>
            )}

            {/* All matchups grid */}
            <h3 className="section-label mb-3 mt-6">ALL MATCHUPS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeMatchups.map((m) => (
                <MatchupCard key={m.id} matchup={m} currentUserId={user?.id ?? null} />
              ))}
            </div>
          </div>
        )}

        {/* All-time H2H leaderboard */}
        {leaders.length > 0 && (
          <div>
            <h2 className="section-label mb-4 flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              ALL-TIME H2H STANDINGS
            </h2>
            <div className="race-card overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
                <div className="w-6">#</div>
                <div>DRIVER</div>
                <div className="w-16 text-center">WINS</div>
                <div className="w-20 text-center hidden sm:block">WIN RATE</div>
                <div className="w-16 text-center">POINTS</div>
              </div>
              {leaders.map((driver, i) => {
                const totalMatchups = (driver as any).h2h_matchups ?? driver.h2h_wins; // fallback
                const winRate = driver.h2h_wins > 0 && totalMatchups > 0
                  ? Math.round((driver.h2h_wins / totalMatchups) * 100)
                  : null;
                return (
                  <div key={driver.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-race-border/50 last:border-0 items-center ${i === 0 ? "bg-yellow-400/5" : "hover:bg-race-muted/20"} transition-colors`}>
                    <div className="w-6 font-display font-black text-lg text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-race-dim text-sm">{i + 1}</span>}
                    </div>
                    <div>
                      <Link href={`/driver/${driver.driver_name.toLowerCase().replace(/\s+/g, "-")}`} className="font-display font-bold text-race-text hover:text-neon-purple transition-colors tracking-wide">
                        {driver.driver_name.toUpperCase()}
                      </Link>
                      {driver.team_name && <p className="text-race-dim text-xs font-mono">{driver.team_name}</p>}
                    </div>
                    <div className="w-16 text-center font-mono font-bold text-race-text">{driver.h2h_wins}</div>
                    <div className="w-20 text-center hidden sm:block">
                      {winRate !== null
                        ? <span className={`font-mono text-sm font-bold ${winRate >= 60 ? "text-neon-green" : winRate >= 40 ? "text-race-dim" : "text-red-400/70"}`}>{winRate}%</span>
                        : <span className="text-race-dim/40 text-xs font-mono">—</span>
                      }
                    </div>
                    <div className="w-16 text-center font-display font-black text-neon-green text-lg">{driver.h2h_points}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past events */}
        {events.filter((e) => e.status === "completed" && e.id !== activeEvent?.id).length > 0 && (
          <div className="mt-10">
            <h2 className="section-label mb-4">PAST EVENTS</h2>
            <div className="space-y-2">
              {events.filter((e) => e.status === "completed" && e.id !== activeEvent?.id).map((e) => (
                <div key={e.id} className="race-card p-4 flex items-center gap-4 opacity-60">
                  <Calendar size={14} className="text-race-dim flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-display font-bold text-race-text text-sm tracking-wide">{e.name.toUpperCase()}</p>
                    <p className="text-race-dim text-xs font-mono">{e.start_date} → {e.end_date}</p>
                  </div>
                  <span className="text-race-dim text-xs font-mono">COMPLETED</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

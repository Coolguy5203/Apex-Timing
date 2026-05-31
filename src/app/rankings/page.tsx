import { createClient } from "@/lib/supabase/server";
import { Trophy, Swords, Target, Star, Medal } from "lucide-react";
import Link from "next/link";

export default async function RankingsPage() {
  const supabase = await createClient();

  // All drivers with any points, ranked by total
  const { data: drivers } = await supabase
    .from("users")
    .select("id, driver_name, team_name, total_points, h2h_points, challenge_points")
    .gt("total_points", 0)
    .order("total_points", { ascending: false })
    .limit(100);

  const { data: { user } } = await supabase.auth.getUser();

  const rows = drivers || [];

  // Also fetch the current user's rank even if outside top 100
  let myRow: any = null;
  let myRank: number | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("users")
      .select("id, driver_name, team_name, total_points, h2h_points, challenge_points")
      .eq("id", user.id)
      .single();
    if (me) {
      const notInList = !rows.find(r => r.id === me.id);
      if (notInList && me.total_points > 0) {
        // get their rank by count of drivers above them
        const { count } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gt("total_points", me.total_points);
        myRank = (count ?? 0) + 1;
        myRow = me;
      }
    }
  }

  function positionBadge(i: number) {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return <span className="text-race-dim font-mono text-sm">{i + 1}</span>;
  }

  const totalPoints = rows.reduce((s, r) => s + r.total_points, 0);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Medal size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">RANKINGS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">ALL-TIME POINTS · H2H + CHALLENGES</p>
          </div>
        </div>

        {/* Point source legend */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 px-3 py-2 bg-race-card border border-race-border rounded text-xs font-mono">
            <Swords size={12} className="text-neon-purple" />
            <span className="text-race-dim">H2H EVENTS</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-race-card border border-race-border rounded text-xs font-mono">
            <Target size={12} className="text-neon-green" />
            <span className="text-race-dim">CHALLENGES</span>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-race-card border border-race-border rounded text-xs font-mono">
            <span className="text-race-dim">TOTAL POINTS AWARDED</span>
            <span className="text-neon-purple font-bold font-display">{totalPoints.toLocaleString()}</span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="race-card p-12 text-center">
            <Medal size={40} className="text-race-dim/20 mx-auto mb-4" />
            <p className="font-display font-bold text-race-text tracking-widest mb-1">NO POINTS YET</p>
            <p className="text-race-dim text-xs font-mono">Points are earned by winning H2H events and challenges.</p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Link href="/h2h" className="px-4 py-2 border border-neon-purple/30 text-neon-purple text-xs font-mono rounded hover:bg-neon-purple/10 transition-all">VIEW H2H</Link>
              <Link href="/challenges" className="px-4 py-2 border border-neon-green/30 text-neon-green text-xs font-mono rounded hover:bg-neon-green/10 transition-all">VIEW CHALLENGES</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {rows.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[rows[1], rows[0], rows[2]].map((driver, podiumIdx) => {
                  const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                  const slug = driver.driver_name.toLowerCase().replace(/\s+/g, "-");
                  const isFirst = actualRank === 1;
                  return (
                    <div key={driver.id} className={`race-card p-4 text-center flex flex-col items-center gap-2 ${isFirst ? "border-neon-purple/40 shadow-lg shadow-neon-purple/10 -mt-4" : ""}`}>
                      <div className="text-3xl">{actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : "🥉"}</div>
                      <Link href={`/driver/${slug}`} className="font-display font-bold text-sm text-race-text hover:text-neon-purple transition-colors tracking-wide text-center truncate w-full">
                        {driver.driver_name.toUpperCase()}
                      </Link>
                      {driver.team_name && <p className="text-race-dim text-[10px] font-mono">{driver.team_name}</p>}
                      <p className={`font-display font-black text-2xl ${isFirst ? "text-neon-purple" : "text-race-text"}`}>{driver.total_points}</p>
                      <p className="text-race-dim text-[10px] font-mono">PTS</p>
                      {/* Breakdown */}
                      <div className="flex gap-3 text-[10px] font-mono text-race-dim mt-1">
                        {driver.h2h_points > 0 && <span className="flex items-center gap-1"><Swords size={9} className="text-neon-purple" />{driver.h2h_points}</span>}
                        {driver.challenge_points > 0 && <span className="flex items-center gap-1"><Target size={9} className="text-neon-green" />{driver.challenge_points}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="race-card overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
                <div className="w-8">#</div>
                <div>DRIVER</div>
                <div className="w-16 text-right hidden sm:block">H2H</div>
                <div className="w-20 text-right hidden sm:block">CHALL</div>
                <div className="w-16 text-right">PTS</div>
              </div>

              {rows.map((driver, i) => {
                const slug = driver.driver_name.toLowerCase().replace(/\s+/g, "-");
                const isMe = driver.id === user?.id;
                return (
                  <div
                    key={driver.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-race-border/50 last:border-0 items-center transition-colors
                      ${i === 0 ? "bg-neon-purple/5" : "hover:bg-race-muted/20"}
                      ${isMe ? "ring-1 ring-inset ring-neon-purple/30" : ""}`}
                  >
                    <div className="w-8 text-center font-display font-black text-lg">
                      {positionBadge(i)}
                    </div>
                    <div>
                      <Link href={`/driver/${slug}`} className="font-display font-bold text-race-text hover:text-neon-purple transition-colors tracking-wide">
                        {driver.driver_name.toUpperCase()}
                        {isMe && <span className="ml-2 text-neon-purple text-[10px] font-mono align-middle">YOU</span>}
                      </Link>
                      {driver.team_name && <p className="text-race-dim text-xs font-mono">{driver.team_name}</p>}
                    </div>
                    <div className="w-16 text-right hidden sm:block">
                      {driver.h2h_points > 0 ? (
                        <span className="font-mono text-sm text-neon-purple font-bold">{driver.h2h_points}</span>
                      ) : (
                        <span className="text-race-dim/30 text-xs font-mono">—</span>
                      )}
                    </div>
                    <div className="w-20 text-right hidden sm:block">
                      {driver.challenge_points > 0 ? (
                        <span className="font-mono text-sm text-neon-green font-bold">{driver.challenge_points}</span>
                      ) : (
                        <span className="text-race-dim/30 text-xs font-mono">—</span>
                      )}
                    </div>
                    <div className="w-16 text-right">
                      <span className={`font-display font-black text-xl ${i === 0 ? "text-neon-purple" : "text-race-text"}`}>
                        {driver.total_points}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* My row if outside top 100 */}
              {myRow && myRank && (
                <>
                  <div className="px-5 py-2 text-center text-race-dim/40 text-xs font-mono border-b border-race-border/30">· · ·</div>
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center ring-1 ring-inset ring-neon-purple/30">
                    <div className="w-8 text-center font-mono text-sm text-race-dim">{myRank}</div>
                    <div>
                      <span className="font-display font-bold text-race-text tracking-wide">
                        {myRow.driver_name.toUpperCase()}
                        <span className="ml-2 text-neon-purple text-[10px] font-mono align-middle">YOU</span>
                      </span>
                      {myRow.team_name && <p className="text-race-dim text-xs font-mono">{myRow.team_name}</p>}
                    </div>
                    <div className="w-16 text-right hidden sm:block">
                      {myRow.h2h_points > 0 ? <span className="font-mono text-sm text-neon-purple font-bold">{myRow.h2h_points}</span> : <span className="text-race-dim/30 text-xs">—</span>}
                    </div>
                    <div className="w-20 text-right hidden sm:block">
                      {myRow.challenge_points > 0 ? <span className="font-mono text-sm text-neon-green font-bold">{myRow.challenge_points}</span> : <span className="text-race-dim/30 text-xs">—</span>}
                    </div>
                    <div className="w-16 text-right">
                      <span className="font-display font-black text-xl text-race-text">{myRow.total_points}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

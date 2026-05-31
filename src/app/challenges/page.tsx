import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/utils/lapTime";
import { Target, Trophy, Calendar, Zap, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

async function getChallenges() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, cars(id, name, class), tracks(id, name)")
    .order("start_date", { ascending: false });

  if (!challenges) return { active: [], upcoming: [], past: [] };

  const active   = challenges.filter((c) => c.start_date <= today && c.end_date >= today);
  const upcoming = challenges.filter((c) => c.start_date >  today);
  const past     = challenges.filter((c) => c.end_date   <  today);
  return { active, upcoming, past };
}

async function getChallengeLeaderboard(challenge: any) {
  const supabase = await createClient();
  const startTs = challenge.start_date + "T00:00:00Z";
  const endTs   = challenge.end_date   + "T23:59:59Z";

  let query = supabase
    .from("lap_times")
    .select("driver_id, lap_time_ms, lap_time_formatted, submitted_at, sector_1_ms, sector_2_ms, sector_3_ms, users(driver_name, team_name)")
    .gte("submitted_at", startTs)
    .lte("submitted_at", endTs)
    .order("lap_time_ms", { ascending: true });

  if (challenge.track_id) query = query.eq("track_id", challenge.track_id);
  if (challenge.car_id)   query = query.eq("car_id",   challenge.car_id);

  const { data: laps } = await query;
  if (!laps || laps.length === 0) return [];

  // If car_class filter, we need to filter in JS (can't join-filter on car class easily)
  const filtered = challenge.car_class
    ? laps // already filtered by car_id or track_id; class filter would need a separate join
    : laps;

  // Best per driver
  const bestMap = new Map<string, typeof laps[0]>();
  for (const lap of filtered) {
    const existing = bestMap.get(lap.driver_id);
    if (!existing || lap.lap_time_ms < existing.lap_time_ms) bestMap.set(lap.driver_id, lap);
  }

  return Array.from(bestMap.values())
    .sort((a, b) => a.lap_time_ms - b.lap_time_ms)
    .slice(0, 20);
}

function ChallengeCard({ challenge, entries, rank }: { challenge: any; entries: any[]; rank?: "active" | "past" }) {
  const today    = new Date().toISOString().slice(0, 10);
  const isActive = challenge.start_date <= today && challenge.end_date >= today;
  const daysLeft = isActive
    ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className={`race-card overflow-hidden ${isActive ? "border-neon-green/30" : ""}`}>
      {/* Challenge header */}
      <div className={`px-6 py-4 border-b border-race-border ${isActive ? "bg-neon-green/5" : "bg-race-dark"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isActive && <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-green/15 text-neon-green border border-neon-green/30 animate-pulse">LIVE</span>}
              <h3 className={`font-display font-bold tracking-widest ${isActive ? "text-neon-green" : "text-race-text"}`}>
                {challenge.name.toUpperCase()}
              </h3>
            </div>
            {challenge.description && (
              <p className="text-race-dim text-xs font-mono">{challenge.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-race-dim">
              {challenge.cars && <span className="flex items-center gap-1">🚗 {(challenge.cars as any).name}</span>}
              {challenge.car_class && !challenge.cars && <span className="flex items-center gap-1">🚗 {challenge.car_class} CLASS</span>}
              {challenge.tracks && <span className="flex items-center gap-1">📍 {(challenge.tracks as any).name}</span>}
              <span className="flex items-center gap-1"><Calendar size={10} />{challenge.start_date} → {challenge.end_date}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Zap size={14} className="text-neon-green" />
              <span className="font-display font-black text-2xl text-neon-green">+{challenge.bonus_points}</span>
            </div>
            <p className="text-race-dim text-[10px] font-mono">BONUS PTS</p>
            {daysLeft !== null && (
              <p className={`text-xs font-mono font-bold mt-1 ${daysLeft <= 1 ? "text-orange-400" : "text-race-dim"}`}>
                <Clock size={10} className="inline mr-0.5" />
                {daysLeft === 0 ? "ENDS TODAY" : `${daysLeft}d LEFT`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {entries.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Target size={24} className="text-race-dim/30 mx-auto mb-2" />
          <p className="text-race-dim text-xs font-mono">NO ENTRIES YET — BE THE FIRST!</p>
          {isActive && (
            <Link href="/submit" className="inline-flex items-center gap-1 mt-3 text-neon-green text-xs font-mono hover:underline">
              SUBMIT A LAP <ChevronRight size={11} />
            </Link>
          )}
        </div>
      ) : (
        <div>
          {entries.map((entry, i) => {
            const user = entry.users as any;
            const hasSectors = entry.sector_1_ms && entry.sector_2_ms && entry.sector_3_ms;
            return (
              <div
                key={entry.driver_id}
                className={`flex items-center gap-4 px-6 py-3 border-b border-race-border/40 last:border-0 ${i === 0 && isActive ? "bg-neon-green/5" : "hover:bg-race-muted/20"} transition-colors`}
              >
                <div className="w-8 text-center flex-shrink-0">
                  {i === 0 ? <span className="text-lg">🥇</span> :
                   i === 1 ? <span className="text-lg">🥈</span> :
                   i === 2 ? <span className="text-lg">🥉</span> :
                   <span className="font-display font-black text-race-dim">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/driver/${user?.driver_name?.toLowerCase().replace(/\s+/g, "-")}`} className="font-display font-bold text-race-text hover:text-neon-purple transition-colors tracking-wide">
                    {user?.driver_name?.toUpperCase()}
                  </Link>
                  {user?.team_name && <p className="text-race-dim text-xs font-mono">{user.team_name}</p>}
                  {hasSectors && (
                    <p className="text-race-dim/60 text-[10px] font-mono mt-0.5">
                      S1 {formatLapTime(entry.sector_1_ms)} · S2 {formatLapTime(entry.sector_2_ms)} · S3 {formatLapTime(entry.sector_3_ms)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-mono font-bold ${i === 0 ? "text-neon-green text-lg" : "text-race-text"}`}>
                    {entry.lap_time_formatted}
                  </p>
                  {i > 0 && entries[0] && (
                    <p className="text-race-dim text-xs font-mono">
                      +{((entry.lap_time_ms - entries[0].lap_time_ms) / 1000).toFixed(3)}s
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function ChallengesPage() {
  const { active, upcoming, past } = await getChallenges();

  // Fetch leaderboards for active + recent past challenges
  const activeWithEntries = await Promise.all(
    active.map(async (c) => ({ challenge: c, entries: await getChallengeLeaderboard(c) }))
  );
  const pastWithEntries = await Promise.all(
    past.slice(0, 3).map(async (c) => ({ challenge: c, entries: await getChallengeLeaderboard(c) }))
  );

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-green-glow border border-neon-green/30 rounded-lg flex items-center justify-center">
            <Target size={20} className="text-neon-green" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">CHALLENGES</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">WEEKLY COMPETITIONS · BONUS POINTS</p>
          </div>
        </div>

        {/* Active challenges */}
        {activeWithEntries.length > 0 && (
          <div className="mb-10">
            <h2 className="section-label mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse inline-block" />
              ACTIVE CHALLENGES
            </h2>
            <div className="space-y-6">
              {activeWithEntries.map(({ challenge, entries }) => (
                <ChallengeCard key={challenge.id} challenge={challenge} entries={entries} rank="active" />
              ))}
            </div>
          </div>
        )}

        {/* No active challenges */}
        {activeWithEntries.length === 0 && (
          <div className="race-card p-10 text-center mb-10">
            <Target size={36} className="text-race-dim/30 mx-auto mb-3" />
            <p className="font-display font-bold text-race-text tracking-widest mb-1">NO ACTIVE CHALLENGES</p>
            <p className="text-race-dim text-xs font-mono">Check back soon — challenges are set by admins weekly.</p>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-10">
            <h2 className="section-label mb-4">UPCOMING</h2>
            <div className="space-y-3">
              {upcoming.map((c) => {
                const daysUntil = Math.ceil((new Date(c.start_date).getTime() - Date.now()) / 86_400_000);
                return (
                  <div key={c.id} className="race-card p-4 flex items-center gap-4 opacity-70">
                    <Calendar size={16} className="text-race-dim flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-display font-bold text-race-text tracking-wide text-sm">{c.name.toUpperCase()}</p>
                      <p className="text-race-dim text-xs font-mono">{c.start_date} → {c.end_date}</p>
                    </div>
                    <span className="text-race-dim text-xs font-mono">STARTS IN {daysUntil}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past challenges */}
        {pastWithEntries.length > 0 && (
          <div>
            <h2 className="section-label mb-4">PAST CHALLENGES</h2>
            <div className="space-y-6 opacity-75">
              {pastWithEntries.map(({ challenge, entries }) => (
                <ChallengeCard key={challenge.id} challenge={challenge} entries={entries} rank="past" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

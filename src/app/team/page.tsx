import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { Users, Trophy, Timer, Zap, Car, MapPin, Medal, Activity, Lock } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";

async function getTeamData(currentUserId: string, teamName: string | null) {
  const supabase = await createClient();

  // Get all drivers on the same team
  let driversQuery = supabase.from("users").select("*");
  if (teamName) {
    driversQuery = driversQuery.eq("team_name", teamName);
  } else {
    driversQuery = driversQuery.eq("id", currentUserId);
  }
  const { data: drivers } = await driversQuery.order("created_at", { ascending: true });

  const driverIds = (drivers || []).map((d) => d.id);

  // Get lap times only for team members
  const { data: lapTimes } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, notes,
      driver_id,
      users(driver_name, team_name),
      cars(name, class),
      tracks(name, country)
    `)
    .in("driver_id", driverIds)
    .order("submitted_at", { ascending: false });

  const allLaps = lapTimes || [];

  // Per-driver stats
  const driverStats = (drivers || []).map((driver) => {
    const driverLaps = allLaps.filter((l) => l.driver_id === driver.id);
    const bestLap = driverLaps.reduce((best, lap) =>
      !best || lap.lap_time_ms < best.lap_time_ms ? lap : best
    , null as any);
    return {
      ...driver,
      lap_count: driverLaps.length,
      best_lap: bestLap,
      last_active: driverLaps[0]?.submitted_at || driver.created_at,
    };
  }).sort((a, b) => b.lap_count - a.lap_count);

  const overallBest = allLaps.reduce((best, lap) =>
    !best || lap.lap_time_ms < best.lap_time_ms ? lap : best
  , null as any);

  return {
    drivers: driverStats,
    recentActivity: allLaps.slice(0, 10),
    stats: {
      totalLaps: allLaps.length,
      totalDrivers: driverStats.length,
      overallBest,
      mostActive: driverStats[0] || null,
    },
  };
}

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const teamName = profile?.team_name || null;
  const { drivers, recentActivity, stats } = await getTeamData(user.id, teamName);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">
                {teamName ? teamName.toUpperCase() : "MY TEAM"}
              </h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">
                PRIVATE TEAM DASHBOARD
              </p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-neon-purple/5 border border-neon-purple/20 rounded-lg w-fit">
            <Lock size={12} className="text-neon-purple" />
            <span className="text-neon-purple text-xs font-mono tracking-wider">
              {teamName
                ? `VISIBLE TO "${teamName.toUpperCase()}" MEMBERS ONLY`
                : "ONLY YOUR DATA IS SHOWN — SET A TEAM NAME TO SHARE WITH TEAMMATES"}
            </span>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="race-card p-5">
            <p className="section-label mb-2">TEAM DRIVERS</p>
            <p className="font-display font-black text-4xl text-gradient-purple">{stats.totalDrivers}</p>
            <p className="text-race-dim text-xs font-mono mt-1">Active pilots</p>
          </div>
          <div className="race-card p-5">
            <p className="section-label mb-2">TEAM LAPS</p>
            <p className="font-display font-black text-4xl text-gradient-purple">{stats.totalLaps}</p>
            <p className="text-race-dim text-xs font-mono mt-1">Total submissions</p>
          </div>
          <div className="race-card p-5">
            <p className="section-label mb-2">TEAM BEST</p>
            {stats.overallBest ? (
              <>
                <p className="lap-time-display text-2xl">{stats.overallBest.lap_time_formatted}</p>
                <p className="text-race-dim text-xs font-mono mt-1 truncate">
                  {(stats.overallBest.users as any)?.driver_name?.toUpperCase()}
                </p>
              </>
            ) : (
              <p className="text-race-dim font-mono text-sm mt-2">NO DATA</p>
            )}
          </div>
          <div className="race-card p-5">
            <p className="section-label mb-2">MOST ACTIVE</p>
            {stats.mostActive?.lap_count > 0 ? (
              <>
                <p className="font-display font-bold text-xl text-race-text tracking-wide truncate">
                  {stats.mostActive.driver_name.toUpperCase()}
                </p>
                <p className="text-race-dim text-xs font-mono mt-1">{stats.mostActive.lap_count} LAPS</p>
              </>
            ) : (
              <p className="text-race-dim font-mono text-sm mt-2">NO DATA</p>
            )}
          </div>
        </div>

        {/* No team warning */}
        {!teamName && (
          <div className="race-card p-6 mb-6 border-neon-purple/30">
            <div className="flex items-start gap-3">
              <Lock size={16} className="text-neon-purple flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-race-text font-mono font-bold text-sm mb-1">YOU DON'T HAVE A TEAM NAME SET</p>
                <p className="text-race-dim text-xs font-mono leading-relaxed">
                  To share this page with teammates, everyone needs to register with the same team name.
                  Your team name was set when you created your account.
                  Currently only showing your own data.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Driver Roster */}
          <div className="lg:col-span-2 race-card p-6">
            <SectionHeader
              title="DRIVER ROSTER"
              subtitle={`${stats.totalDrivers} team ${stats.totalDrivers === 1 ? "driver" : "drivers"}`}
              icon={Users}
            />
            {drivers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-race-dim font-mono text-sm">NO DRIVERS YET</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drivers.map((driver, index) => (
                  <div
                    key={driver.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 hover:border-neon-purple/30 hover:bg-neon-purple/5
                      ${driver.id === user.id ? "border-neon-purple/30 bg-neon-purple/5" : "border-race-border bg-race-dark"}`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-display font-black text-lg flex-shrink-0 ${
                      index === 0 ? "text-neon-purple" :
                      index === 1 ? "text-lap-silver" :
                      index === 2 ? "text-lap-bronze" : "text-race-dim"
                    }`}>
                      {index === 0 ? <Medal size={18} className="text-neon-purple" /> : index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-black text-neon-purple text-lg">
                        {driver.driver_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-race-text tracking-wide">
                          {driver.driver_name.toUpperCase()}
                        </span>
                        {driver.id === user.id && (
                          <Badge variant="purple" size="sm">YOU</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-race-dim text-xs font-mono">
                          {driver.lap_count} {driver.lap_count === 1 ? "LAP" : "LAPS"}
                        </span>
                        {driver.best_lap && (
                          <span className="flex items-center gap-1 text-neon-purple text-xs font-mono">
                            <Zap size={10} />
                            BEST: {driver.best_lap.lap_time_formatted}
                          </span>
                        )}
                        <span className="text-race-dim/60 text-xs font-mono">
                          {formatRelativeTime(driver.last_active)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-2xl font-display font-black ${index === 0 ? "text-neon-purple" : "text-race-text"}`}>
                        {driver.lap_count}
                      </div>
                      <div className="text-race-dim text-xs font-mono">LAPS</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Team Best Laps */}
            <div className="race-card p-6">
              <SectionHeader title="BEST LAPS" subtitle="Fastest per driver" icon={Trophy} />
              {drivers.filter(d => d.best_lap).length === 0 ? (
                <p className="text-race-dim font-mono text-sm text-center py-6">NO LAPS YET</p>
              ) : (
                <div className="space-y-2">
                  {drivers
                    .filter(d => d.best_lap)
                    .sort((a, b) => a.best_lap.lap_time_ms - b.best_lap.lap_time_ms)
                    .slice(0, 5)
                    .map((driver, index) => (
                      <div key={driver.id} className="flex items-center gap-3 p-2 rounded hover:bg-race-muted transition-colors">
                        <span className={`font-display font-black text-lg w-6 text-center ${
                          index === 0 ? "text-neon-purple" :
                          index === 1 ? "text-lap-silver" :
                          index === 2 ? "text-lap-bronze" : "text-race-dim"
                        }`}>{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-race-text text-sm tracking-wide truncate">
                            {driver.driver_name.toUpperCase()}
                          </p>
                          <p className="text-race-dim text-xs font-mono truncate">
                            {(driver.best_lap.cars as any)?.name} · {(driver.best_lap.tracks as any)?.name}
                          </p>
                        </div>
                        <span className={`font-mono font-bold text-sm flex-shrink-0 ${index === 0 ? "text-neon-purple" : "text-race-text"}`}>
                          {driver.best_lap.lap_time_formatted}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="race-card p-6">
              <SectionHeader title="TEAM FEED" subtitle="Latest team activity" icon={Activity} />
              {recentActivity.length === 0 ? (
                <p className="text-race-dim font-mono text-sm text-center py-6">NO ACTIVITY YET</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((lap) => (
                    <div key={lap.id} className="flex items-start gap-3 pb-3 border-b border-race-border/50 last:border-0 last:pb-0">
                      <div className="w-7 h-7 rounded bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="font-display font-black text-neon-purple text-xs">
                          {(lap.users as any)?.driver_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-race-text text-xs font-mono font-bold">
                          {(lap.users as any)?.driver_name?.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1 text-race-dim text-xs font-mono mt-0.5">
                          <Car size={9} />
                          <span className="truncate">{(lap.cars as any)?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-race-dim text-xs font-mono">
                          <MapPin size={9} />
                          <span className="truncate">{(lap.tracks as any)?.name}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-neon-purple text-xs font-mono font-bold">{lap.lap_time_formatted}</p>
                        <p className="text-race-dim text-xs font-mono">{formatRelativeTime(lap.submitted_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

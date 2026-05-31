import Link from "next/link";
import { getLatestSubmissions, getDashboardStats, getCars, getTracks } from "@/lib/supabase/queries";
import { StatCard } from "@/components/ui/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LatestSubmissions } from "@/components/dashboard/LatestSubmissions";
import { TopDrivers } from "@/components/dashboard/TopDrivers";
import { PersonalDashboard } from "@/components/dashboard/PersonalDashboard";
import { createClient } from "@/lib/supabase/server";
import { Users, Timer, MapPin, Trophy, Flag, ChevronRight, Zap, Swords, Star, Award, Target } from "lucide-react";

async function getTopDrivers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lap_times")
    .select("driver_id, users(driver_name, team_name)")
    .order("submitted_at", { ascending: false });

  if (!data) return [];

  const counts = new Map<string, { driver_name: string; team_name?: string; lap_count: number }>();
  for (const entry of data) {
    const user = entry.users as any;
    const existing = counts.get(entry.driver_id);
    if (existing) {
      existing.lap_count++;
    } else {
      counts.set(entry.driver_id, {
        driver_name: user?.driver_name || "Unknown",
        team_name: user?.team_name,
        lap_count: 1,
      });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.lap_count - a.lap_count)
    .slice(0, 5);
}

export default async function HomePage() {
  const supabaseClient = await createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();

  let currentProfile: { id: string; driver_name: string } | null = null;
  if (user) {
    const { data } = await supabaseClient
      .from("users")
      .select("id, driver_name")
      .eq("id", user.id)
      .single();
    currentProfile = data;
  }

  const [submissions, stats, topDrivers, cars, tracks] = await Promise.all([
    getLatestSubmissions(8),
    getDashboardStats(),
    getTopDrivers(),
    getCars(),
    getTracks(),
  ]);

  return (
    <div className="grid-bg min-h-screen">
      <section className="relative overflow-hidden px-4 sm:px-6 pt-12 pb-16 max-w-7xl mx-auto">
        <div className="absolute inset-0 bg-glow-purple pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-purple/10 border border-neon-purple/20 rounded-full mb-6">
            <Zap size={12} className="text-neon-purple" />
            <span className="text-neon-purple text-xs font-mono tracking-widest">
              PROFESSIONAL LAP TIME TRACKING
            </span>
          </div>
          <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl text-race-text leading-none tracking-tight mb-4">
            EVERY<br />
            <span className="text-gradient-purple">MILLISECOND</span><br />
            COUNTS.
          </h1>
          <p className="text-race-dim font-body text-lg max-w-lg mb-8 leading-relaxed">
            Track lap times, compare performance, and dominate the leaderboard with your iRacing team.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 bg-neon-purple hover:bg-neon-purple-dark text-white font-display font-bold tracking-widest text-sm px-6 py-3 rounded-lg transition-all duration-200"
              style={{ boxShadow: "0 0 30px rgba(184,79,255,0.3)" }}
            >
              <Flag size={16} />
              POST A LAP TIME
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 bg-race-card border border-race-border hover:border-neon-purple/40 text-race-text font-display font-bold tracking-widest text-sm px-6 py-3 rounded-lg transition-all duration-200"
            >
              <Trophy size={16} />
              VIEW LEADERBOARD
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="TOTAL DRIVERS" value={stats.total_drivers} icon={Users} accent="purple" subtext="Registered pilots" />
          <StatCard label="LAP TIMES LOGGED" value={stats.total_laps} icon={Timer} accent="purple" subtext="All time submissions" />
          <StatCard label="CIRCUITS" value={stats.total_tracks} icon={MapPin} accent="green" subtext="Available tracks" />
        </div>
      </section>

      {currentProfile && (
        <PersonalDashboard
          userId={currentProfile.id}
          driverName={currentProfile.driver_name}
          driverSlug={currentProfile.driver_name.toLowerCase().replace(/\s+/g, "-")}
        />
      )}

      {/* Feature highlights — only for logged-out visitors */}
      {!currentProfile && (
        <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-16">
          <div className="text-center mb-10">
            <p className="text-race-dim font-mono text-xs tracking-widest mb-2">WHAT YOU GET</p>
            <h2 className="font-display font-black text-3xl text-race-text tracking-wider">EVERYTHING YOU NEED TO COMPETE</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Trophy,  color: "text-neon-purple", bg: "bg-neon-purple/10 border-neon-purple/20", title: "LIVE LEADERBOARDS",    desc: "Real-time rankings for every car and track combo. See exactly where you stand against everyone." },
              { icon: Swords,  color: "text-neon-green",  bg: "bg-neon-green/10  border-neon-green/20",  title: "HEAD-TO-HEAD BATTLES", desc: "Get matched against drivers at your skill level. Win points, climb the rankings." },
              { icon: Star,    color: "text-yellow-400",  bg: "bg-yellow-400/10  border-yellow-400/20",  title: "CHAMPIONSHIP SEASONS", desc: "F1-style points across a full season. Compete for the title with your whole team." },
              { icon: Users,   color: "text-neon-purple", bg: "bg-neon-purple/10 border-neon-purple/20", title: "TEAM STANDINGS",       desc: "Race together. Combined team points, roster stats, and your own private team dashboard." },
              { icon: Award,   color: "text-neon-green",  bg: "bg-neon-green/10  border-neon-green/20",  title: "47 ACHIEVEMENTS",      desc: "Earn badges for milestones, streaks, consistency, and dominating the competition." },
              { icon: Target,  color: "text-yellow-400",  bg: "bg-yellow-400/10  border-yellow-400/20",  title: "DAILY CHALLENGES",     desc: "Specific car + track events with bonus points. Your streak keeps you honest." },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="race-card p-6 hover:border-neon-purple/20 transition-colors">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-4 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <p className="font-display font-bold text-race-text tracking-wider text-sm mb-2">{title}</p>
                <p className="text-race-dim text-xs font-mono leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 bg-neon-purple hover:bg-neon-purple-dark text-white font-display font-bold tracking-widest text-sm px-8 py-3.5 rounded-lg transition-all duration-200"
              style={{ boxShadow: "0 0 30px rgba(184,79,255,0.3)" }}
            >
              <Flag size={16} />CREATE FREE ACCOUNT
            </Link>
            <p className="text-race-dim/50 text-xs font-mono mt-3">No subscription required. Free forever.</p>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="race-card p-6">
              <SectionHeader
                title="LATEST SUBMISSIONS"
                subtitle="Most recent lap times from all drivers"
                icon={Timer}
                action={
                  <Link href="/leaderboard" className="text-xs font-mono text-neon-purple hover:underline flex items-center gap-1">
                    VIEW ALL <ChevronRight size={12} />
                  </Link>
                }
              />
              <LatestSubmissions submissions={submissions} />
            </div>
          </div>
          <div className="space-y-6">
            <div className="race-card p-6">
              <SectionHeader title="TOP DRIVERS" subtitle="Most active this season" icon={Trophy} />
              <TopDrivers drivers={topDrivers} />
            </div>
            <div className="race-card p-6">
              <h3 className="section-label mb-4">QUICK FILTERS</h3>
              <div className="space-y-2">
                {cars.slice(0, 4).map((car) => (
                  <Link
                    key={car.id}
                    href={`/leaderboard?car=${car.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded bg-race-muted hover:bg-neon-purple-glow border border-race-border hover:border-neon-purple/30 transition-all text-sm font-mono text-race-dim hover:text-race-text group"
                  >
                    <span>{car.name}</span>
                    <ChevronRight size={12} className="group-hover:text-neon-purple transition-colors" />
                  </Link>
                ))}
                {tracks.slice(0, 3).map((track) => (
                  <Link
                    key={track.id}
                    href={`/leaderboard?track=${track.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded bg-race-muted hover:bg-neon-purple-glow border border-race-border hover:border-neon-purple/30 transition-all text-sm font-mono text-race-dim hover:text-race-text group"
                  >
                    <span>{track.name}</span>
                    <ChevronRight size={12} className="group-hover:text-neon-purple transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

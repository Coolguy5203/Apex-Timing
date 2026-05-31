import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENT_TIERS } from "@/lib/achievements";
import { Trophy, Lock, Star } from "lucide-react";
import Link from "next/link";

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

const TIER_ORDER = ["legendary", "gold", "silver", "bronze"];

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // All achievements + user's unlocks in parallel
  const [{ data: allAch }, userAchRes, leadersRes] = await Promise.all([
    supabase.from("achievements").select("key, name, description, icon, tier").order("tier").order("name"),
    user
      ? supabase.from("user_achievements").select("achievement_key, unlocked_at").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    // Top drivers by achievement count
    supabase.from("user_achievements")
      .select("user_id, users(driver_name, team_name)")
      .then(async (res) => {
        if (!res.data) return [];
        const counts = new Map<string, { name: string; team: string; count: number }>();
        for (const row of res.data) {
          const u = row.users as any;
          const id = row.user_id;
          if (!counts.has(id)) counts.set(id, { name: u?.driver_name ?? "?", team: u?.team_name ?? "", count: 0 });
          counts.get(id)!.count++;
        }
        return [...counts.entries()]
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }),
  ]);

  const achievements: Achievement[] = allAch || [];
  const unlockedKeys = new Set((userAchRes.data || []).map((a: any) => a.achievement_key));
  const unlockedMap = new Map((userAchRes.data || []).map((a: any) => [a.achievement_key, a.unlocked_at]));

  const byTier = TIER_ORDER.reduce<Record<string, Achievement[]>>((acc, t) => {
    acc[t] = achievements.filter((a) => a.tier === t);
    return acc;
  }, {});

  const total = achievements.length;
  const earned = unlockedKeys.size;

  const tierConfig = {
    legendary: { label: "LEGENDARY", bg: "bg-neon-purple/5", border: "border-neon-purple/30", headerColor: "text-neon-purple", glowStyle: { boxShadow: "0 0 30px rgba(184,79,255,0.1)" } },
    gold:      { label: "GOLD",      bg: "bg-yellow-400/5",  border: "border-yellow-400/20",  headerColor: "text-yellow-400",  glowStyle: {} },
    silver:    { label: "SILVER",    bg: "bg-gray-300/5",    border: "border-gray-300/20",    headerColor: "text-gray-300",    glowStyle: {} },
    bronze:    { label: "BRONZE",    bg: "bg-amber-600/5",   border: "border-amber-600/20",   headerColor: "text-amber-500",   glowStyle: {} },
  };

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Trophy size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">ACHIEVEMENTS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">COMPLETE CHALLENGES TO UNLOCK BADGES</p>
          </div>
        </div>

        {/* Progress bar (only for logged-in users) */}
        {user && (
          <div className="race-card p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display font-bold text-race-text tracking-wide">YOUR PROGRESS</p>
                <p className="text-race-dim text-xs font-mono">{earned} of {total} achievements unlocked</p>
              </div>
              <p className="font-display font-black text-3xl text-neon-purple">{earned}<span className="text-race-dim text-lg font-mono">/{total}</span></p>
            </div>
            <div className="h-2 bg-race-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-purple to-neon-purple/60 rounded-full transition-all"
                style={{ width: `${total ? (earned / total) * 100 : 0}%` }}
              />
            </div>
            {/* Tier breakdown */}
            <div className="flex gap-4 mt-3">
              {TIER_ORDER.map((t) => {
                const tier = ACHIEVEMENT_TIERS[t];
                const tierAchs = byTier[t] || [];
                const tierEarned = tierAchs.filter(a => unlockedKeys.has(a.key)).length;
                return (
                  <div key={t} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className={`font-bold ${tier.color}`}>{tierEarned}/{tierAchs.length}</span>
                    <span className="text-race-dim">{tier.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier sections */}
        <div className="space-y-8">
          {TIER_ORDER.map((tierKey) => {
            const achs = byTier[tierKey] || [];
            if (achs.length === 0) return null;
            const tier = ACHIEVEMENT_TIERS[tierKey];
            const cfg = tierConfig[tierKey as keyof typeof tierConfig];
            const tierEarned = achs.filter(a => unlockedKeys.has(a.key)).length;

            return (
              <div key={tierKey}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`} style={cfg.glowStyle}>
                    <Star size={12} className={cfg.headerColor} />
                    <span className={`font-display font-black text-sm tracking-widest ${cfg.headerColor}`}>{cfg.label}</span>
                  </div>
                  <span className="text-race-dim text-xs font-mono">{tierEarned}/{achs.length} EARNED</span>
                  <div className="flex-1 h-px bg-race-border" />
                </div>

                {/* Achievement cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achs.map((ach) => {
                    const earned = unlockedKeys.has(ach.key);
                    const unlockedAt = unlockedMap.get(ach.key);
                    return (
                      <div
                        key={ach.key}
                        className={`race-card p-4 flex items-start gap-4 transition-all ${
                          earned
                            ? `${cfg.bg} ${cfg.border}`
                            : "opacity-50"
                        }`}
                        style={earned ? cfg.glowStyle : {}}
                      >
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                          earned ? `${cfg.bg} border ${cfg.border}` : "bg-race-dark border border-race-border/30 grayscale"
                        }`}>
                          {earned ? ach.icon : <Lock size={16} className="text-race-dim/40" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`font-display font-bold text-sm tracking-wide ${earned ? "text-race-text" : "text-race-dim"}`}>
                              {ach.name.toUpperCase()}
                            </p>
                            {earned && (
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${tier.bg} ${tier.color} ${tier.border}`}>
                                {tier.label}
                              </span>
                            )}
                          </div>
                          <p className="text-race-dim/70 text-xs font-mono leading-relaxed">{ach.description}</p>
                          {earned && unlockedAt && (
                            <p className={`text-[10px] font-mono mt-1.5 ${tier.color} opacity-70`}>
                              Earned {new Date(unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                          {!earned && !user && (
                            <Link href="/auth" className={`text-[10px] font-mono mt-1 ${tier.color} opacity-60 hover:opacity-100 transition-opacity`}>
                              Sign in to track →
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard — most achievements */}
        {leadersRes.length > 0 && (
          <div className="mt-12">
            <h2 className="section-label mb-4 flex items-center gap-2">
              <Trophy size={13} className="text-yellow-400" />
              MOST ACHIEVEMENTS
            </h2>
            <div className="race-card overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
                <div className="w-6">#</div>
                <div>DRIVER</div>
                <div>BADGES</div>
              </div>
              {leadersRes.map((driver, i) => (
                <div key={driver.id} className={`grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 border-b border-race-border/50 last:border-0 items-center hover:bg-race-muted/20 transition-colors ${i === 0 ? "bg-yellow-400/5" : ""}`}>
                  <div className="w-6 font-display font-black text-lg text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-race-dim text-sm">{i + 1}</span>}
                  </div>
                  <div>
                    <Link href={`/driver/${driver.name.toLowerCase().replace(/\s+/g, "-")}`} className="font-display font-bold text-race-text hover:text-neon-purple transition-colors tracking-wide">
                      {driver.name.toUpperCase()}
                    </Link>
                    {driver.team && <p className="text-race-dim text-xs font-mono">{driver.team}</p>}
                  </div>
                  <div className="font-display font-black text-xl text-neon-purple">{driver.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import { ACHIEVEMENT_TIERS } from "@/lib/achievements";

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface UserAchievement {
  achievement_key: string;
  unlocked_at: string;
  achievements: Achievement;
}

interface AchievementGridProps {
  userAchievements: UserAchievement[];
  allAchievements: Achievement[];
}

export function AchievementGrid({ userAchievements, allAchievements }: AchievementGridProps) {
  const unlockedKeys = new Set(userAchievements.map((a) => a.achievement_key));
  const unlockedMap  = new Map(userAchievements.map((a) => [a.achievement_key, a.unlocked_at]));

  if (userAchievements.length === 0 && allAchievements.length === 0) return null;

  return (
    <div className="race-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-bold text-race-text tracking-widest text-sm">ACHIEVEMENTS</h3>
          <p className="text-race-dim text-xs font-mono mt-0.5">
            {unlockedKeys.size}/{allAchievements.length} UNLOCKED
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-race-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-purple rounded-full transition-all"
            style={{ width: `${allAchievements.length ? (unlockedKeys.size / allAchievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {allAchievements.map((ach) => {
          const earned = unlockedKeys.has(ach.key);
          const tier   = ACHIEVEMENT_TIERS[ach.tier] ?? ACHIEVEMENT_TIERS.bronze;
          return (
            <div
              key={ach.key}
              title={earned ? `${ach.name} — ${ach.description}` : `🔒 ${ach.name} — ${ach.description}`}
              className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                earned
                  ? `${tier.bg} ${tier.border} cursor-default`
                  : "bg-race-dark border-race-border/30 opacity-35 grayscale"
              }`}
            >
              <span className={`text-2xl leading-none ${earned ? "" : "filter grayscale"}`}>{ach.icon}</span>
              <span className={`text-[10px] font-mono font-bold leading-tight ${earned ? tier.color : "text-race-dim"}`}>
                {ach.name.toUpperCase()}
              </span>
              {earned && (
                <span className={`text-[9px] font-mono ${tier.color} opacity-60`}>{tier.label}</span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-race-card border border-race-border rounded-lg p-2.5 text-left opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                <p className="text-race-text text-xs font-mono font-bold mb-1">{ach.icon} {ach.name}</p>
                <p className="text-race-dim text-[10px] font-mono leading-relaxed">{ach.description}</p>
                {earned && unlockedMap.has(ach.key) && (
                  <p className={`text-[9px] font-mono mt-1.5 ${tier.color}`}>
                    Earned · {new Date(unlockedMap.get(ach.key)!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

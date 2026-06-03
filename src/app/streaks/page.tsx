import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { FlameIcon } from "@/components/ui/FlameIcon";

export const metadata = {
  title: "Streak Tiers | APEX TIMING",
  description: "Daily lap streak tiers and rewards",
};

const TIERS = [
  { days: 0,  name: "NO STREAK",  desc: "Submit a lap to ignite it" },
  { days: 1,  name: "SPARK",      desc: "Day one — the spark catches" },
  { days: 3,  name: "BUILDING",   desc: "2–3 days, gaining heat" },
  { days: 5,  name: "HEATING UP", desc: "4–6 days, embers rising" },
  { days: 10, name: "WEEK",       desc: "7–13 days, locked in" },
  { days: 20, name: "ON FIRE",    desc: "14–29 days, burning hot" },
  { days: 45, name: "BLAZING",    desc: "30–59 days, aura ignites" },
  { days: 90, name: "LEGENDARY",  desc: "60+ days, gold & purple flame" },
];

export default function StreaksPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <FlameIcon tier="legendary" size={40} />
          <h1 className="font-display font-black text-4xl text-race-text tracking-wider">STREAK TIERS</h1>
        </div>
        <p className="text-race-dim font-mono text-xs tracking-widest mb-8">
          POST A LAP EVERY DAY TO BUILD YOUR STREAK · HIGHER TIERS UNLOCK HOTTER FLAMES
        </p>

        {/* Flame line-up */}
        <div className="race-card p-6 mb-8">
          <p className="section-label mb-5">THE FLAMES</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {TIERS.map((t) => (
              <div key={t.days} className="flex flex-col items-center gap-2 min-w-[64px]">
                <div className="h-14 flex items-end">
                  <FlameIcon size={t.days >= 30 ? 52 : t.days >= 7 ? 44 : 36} {...flameProps(t.days)} />
                </div>
                <p className="text-[10px] font-mono font-bold text-race-text tracking-wider text-center">{t.name}</p>
                <p className="text-[9px] font-mono text-race-dim/50">{t.days === 0 ? "—" : `${t.days}d`}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full cards */}
        <p className="section-label mb-4">STREAK CARD · EVERY TIER</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {TIERS.map((t) => (
            <div key={t.days}>
              <StreakDisplay current={t.days} longest={Math.max(t.days, 90)} shields={t.days >= 30 ? 3 : t.days >= 7 ? 2 : t.days >= 2 ? 1 : 0} />
              <p className="text-race-dim/60 text-[10px] font-mono text-center mt-2 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// helper to map day count → FlameIcon tier without importing flameTier on the server boundary repeatedly
function flameProps(days: number): { tier: any } {
  if (days >= 60) return { tier: "legendary" };
  if (days >= 30) return { tier: "blazing" };
  if (days >= 14) return { tier: "onfire" };
  if (days >= 7)  return { tier: "week" };
  if (days >= 4)  return { tier: "heating" };
  if (days >= 2)  return { tier: "building" };
  if (days >= 1)  return { tier: "spark" };
  return { tier: "dead" };
}

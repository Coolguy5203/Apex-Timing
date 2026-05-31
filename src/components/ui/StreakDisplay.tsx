interface StreakTier {
  minDays: number;
  label: string;
  sublabel: string;
  flames: string;
  cardClass: string;
  glowStyle: React.CSSProperties;
  numberClass: string;
  labelClass: string;
  borderStyle: React.CSSProperties;
  pulse: boolean;
}

function getTier(days: number): StreakTier {
  if (days >= 60) return {
    minDays: 60,
    label: "LEGENDARY",
    sublabel: "UNSTOPPABLE",
    flames: "🔥🔥🔥🔥🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(255,215,0,0.6)", boxShadow: "0 0 40px rgba(255,215,0,0.3), inset 0 0 40px rgba(184,79,255,0.1)" },
    glowStyle: { background: "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(184,79,255,0.15) 50%, rgba(255,100,0,0.1) 100%)" },
    numberClass: "",
    labelClass: "text-yellow-300",
    pulse: true,
  };
  if (days >= 30) return {
    minDays: 30,
    label: "BLAZING",
    sublabel: "30+ DAYS",
    flames: "🔥🔥🔥🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(239,68,68,0.7)", boxShadow: "0 0 30px rgba(239,68,68,0.25)" },
    glowStyle: { background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(251,146,60,0.1) 100%)" },
    numberClass: "text-red-400",
    labelClass: "text-red-400",
    pulse: true,
  };
  if (days >= 14) return {
    minDays: 14,
    label: "ON FIRE",
    sublabel: "2 WEEK+",
    flames: "🔥🔥🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(249,115,22,0.6)", boxShadow: "0 0 24px rgba(249,115,22,0.2)" },
    glowStyle: { background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.1) 100%)" },
    numberClass: "text-orange-400",
    labelClass: "text-orange-400",
    pulse: true,
  };
  if (days >= 7) return {
    minDays: 7,
    label: "WEEK STREAK",
    sublabel: "LOCKED IN",
    flames: "🔥🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(249,115,22,0.5)", boxShadow: "0 0 18px rgba(249,115,22,0.15)" },
    glowStyle: { background: "linear-gradient(135deg, rgba(249,115,22,0.12) 0%, transparent 100%)" },
    numberClass: "text-orange-400",
    labelClass: "text-orange-400",
    pulse: false,
  };
  if (days >= 4) return {
    minDays: 4,
    label: "HEATING UP",
    sublabel: `${days} DAYS`,
    flames: "🔥🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(249,115,22,0.4)" },
    glowStyle: { background: "rgba(249,115,22,0.08)" },
    numberClass: "text-orange-400",
    labelClass: "text-orange-400",
    pulse: false,
  };
  if (days >= 2) return {
    minDays: 2,
    label: "BUILDING",
    sublabel: `${days} DAYS`,
    flames: "🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(249,115,22,0.3)" },
    glowStyle: { background: "rgba(249,115,22,0.05)" },
    numberClass: "text-orange-400",
    labelClass: "text-orange-400",
    pulse: false,
  };
  if (days === 1) return {
    minDays: 1,
    label: "STARTED",
    sublabel: "KEEP IT UP",
    flames: "🔥",
    cardClass: "relative overflow-hidden",
    borderStyle: { border: "1px solid rgba(249,115,22,0.2)" },
    glowStyle: { background: "rgba(249,115,22,0.04)" },
    numberClass: "text-orange-300",
    labelClass: "text-orange-300",
    pulse: false,
  };
  // 0 days
  return {
    minDays: 0,
    label: "NO STREAK",
    sublabel: "SUBMIT A LAP",
    flames: "",
    cardClass: "relative overflow-hidden",
    borderStyle: {},
    glowStyle: {},
    numberClass: "text-race-dim",
    labelClass: "text-race-dim",
    pulse: false,
  };
}

interface StreakDisplayProps {
  current: number;
  longest: number;
  shields?: number;
  hasLapToday?: boolean;
  /** "card" = full stat card (dashboard/profile), "badge" = compact inline badge */
  variant?: "card" | "badge";
}

export function StreakDisplay({ current, longest, shields = 0, hasLapToday = true, variant = "card" }: StreakDisplayProps) {
  const tier = getTier(current);

  if (variant === "badge") {
    if (current < 2) return null;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-bold"
        style={{ ...tier.borderStyle, background: (tier.glowStyle as any).background || "transparent" }}
      >
        <span>{tier.flames}</span>
        <span className={tier.labelClass}>{current} DAY STREAK</span>
      </span>
    );
  }

  // Card variant
  return (
    <div className={`race-card p-4 text-center ${tier.cardClass}`} style={tier.borderStyle}>
      {/* Background glow layer */}
      <div className="absolute inset-0 pointer-events-none" style={tier.glowStyle} />

      {/* Legendary shimmer overlay */}
      {current >= 60 && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 3s infinite linear",
          }}
        />
      )}

      <div className="relative">
        {/* Flames — dimmed if no lap today and streak is active */}
        <div className={`text-xl mb-1 leading-none transition-opacity ${tier.pulse && hasLapToday ? "animate-pulse" : ""} ${current > 0 && !hasLapToday ? "opacity-30 grayscale" : ""}`}>
          {current === 0 ? (
            <span className="text-race-dim opacity-30 text-lg">🔥</span>
          ) : (
            tier.flames
          )}
        </div>

        {/* Number */}
        <p
          className={`font-display font-black leading-none mb-0.5 ${tier.numberClass}`}
          style={
            current >= 60
              ? { fontSize: "1.75rem", background: "linear-gradient(135deg, #ffd700, #b84fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
              : current >= 30
              ? { fontSize: "1.75rem" }
              : { fontSize: "1.5rem" }
          }
        >
          {current}
        </p>

        {/* Main label */}
        <p className={`text-xs font-mono font-bold tracking-widest ${tier.labelClass}`}>
          {tier.label}
        </p>

        {/* Sub label */}
        <p className="text-race-dim/50 text-[10px] font-mono mt-0.5">
          {current === 0 && longest > 0 ? `BEST: ${longest}` : tier.sublabel}
        </p>

        {/* Shield icons */}
        <div className="flex items-center justify-center gap-0.5 mt-2">
          {Array.from({ length: 3 }).map((_, i) => {
            const active = i < shields;
            return (
              <svg key={i} width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.5 0.5L1 2.5V6.5C1 9.3 3 11.9 5.5 12.5C8 11.9 10 9.3 10 6.5V2.5L5.5 0.5Z"
                  fill={active ? (current >= 60 ? "#ffd700" : current >= 30 ? "#f87171" : "#f97316") : "none"}
                  stroke={active ? (current >= 60 ? "#ffd700" : current >= 30 ? "#f87171" : "#f97316") : "rgba(255,255,255,0.15)"}
                  strokeWidth="1"
                />
              </svg>
            );
          })}
        </div>

        {/* Nudge — only shown when streak is active but no lap submitted today */}
        {current > 0 && !hasLapToday && (
          <a
            href="/submit"
            className="block mt-3 px-2 py-1.5 rounded bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
          >
            <p className="text-orange-400 text-[9px] font-mono font-bold tracking-widest leading-tight">
              NO LAP TODAY
            </p>
            <p className="text-orange-300/70 text-[9px] font-mono leading-tight mt-0.5">
              SUBMIT ONE TO KEEP YOUR STREAK →
            </p>
          </a>
        )}
      </div>
    </div>
  );
}

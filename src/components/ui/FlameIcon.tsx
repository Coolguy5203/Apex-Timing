"use client";

/**
 * Custom SVG flame badge that escalates visually with the streak tier.
 * Replaces the plain 🔥 emoji with layered gradient flames, glow,
 * flicker animation, rising embers, and (at the top tier) a golden aura.
 */

export type FlameTier =
  | "dead"      // 0 days
  | "spark"     // 1
  | "building"  // 2-3
  | "heating"   // 4-6
  | "week"      // 7-13
  | "onfire"    // 14-29
  | "blazing"   // 30-59
  | "legendary"; // 60+

export function flameTier(days: number): FlameTier {
  if (days >= 60) return "legendary";
  if (days >= 30) return "blazing";
  if (days >= 14) return "onfire";
  if (days >= 7)  return "week";
  if (days >= 4)  return "heating";
  if (days >= 2)  return "building";
  if (days >= 1)  return "spark";
  return "dead";
}

interface Palette {
  outer: [string, string];   // outer flame gradient (top→bottom)
  inner: [string, string];   // inner flame gradient
  core: string;              // hot core
  glow: string;              // drop-shadow / aura colour
  embers: boolean;
  aura: boolean;
  fast: boolean;             // faster flicker for hotter tiers
}

const PALETTES: Record<FlameTier, Palette> = {
  dead:      { outer: ["#3a3a44", "#26262e"], inner: ["#4a4a55", "#33333b"], core: "#55555f", glow: "transparent", embers: false, aura: false, fast: false },
  spark:     { outer: ["#fb923c", "#ea580c"], inner: ["#fde047", "#fb923c"], core: "#fef9c3", glow: "#f97316", embers: false, aura: false, fast: false },
  building:  { outer: ["#fb923c", "#ea580c"], inner: ["#fbbf24", "#f97316"], core: "#fef08a", glow: "#f97316", embers: false, aura: false, fast: false },
  heating:   { outer: ["#fb923c", "#dc2626"], inner: ["#fbbf24", "#f97316"], core: "#fef08a", glow: "#f97316", embers: true,  aura: false, fast: false },
  week:      { outer: ["#f97316", "#dc2626"], inner: ["#fcd34d", "#f97316"], core: "#fff7cd", glow: "#ef4444", embers: true,  aura: false, fast: false },
  onfire:    { outer: ["#f87171", "#b91c1c"], inner: ["#fb923c", "#dc2626"], core: "#ffedd5", glow: "#ef4444", embers: true,  aura: false, fast: true  },
  blazing:   { outer: ["#fca5a5", "#991b1b"], inner: ["#f87171", "#dc2626"], core: "#fee2e2", glow: "#dc2626", embers: true,  aura: true,  fast: true  },
  legendary: { outer: ["#fde047", "#c026d3"], inner: ["#fef9c3", "#a855f7"], core: "#ffffff", glow: "#fbbf24", embers: true,  aura: true,  fast: true  },
};

interface FlameIconProps {
  tier: FlameTier;
  /** pixel size (height) */
  size?: number;
  /** disable motion (e.g. when no lap submitted today) */
  animated?: boolean;
  className?: string;
}

export function FlameIcon({ tier, size = 40, animated = true, className }: FlameIconProps) {
  const p = PALETTES[tier];
  const uid = `fl-${tier}`;
  const w = size * 0.78;
  const flickerClass = animated && tier !== "dead" ? (p.fast ? "flame-flicker-fast" : "flame-flicker") : "";

  return (
    <span
      className={className}
      style={{ display: "inline-block", width: w, height: size, position: "relative", lineHeight: 0 }}
    >
      {/* Aura ring (top tiers) */}
      {p.aura && animated && (
        <span
          className="flame-aura"
          style={{
            position: "absolute", inset: "-18%", borderRadius: "50%",
            background: `radial-gradient(circle, ${p.glow}55 0%, transparent 68%)`,
            pointerEvents: "none",
          }}
        />
      )}

      <svg
        viewBox="0 0 32 40"
        width={w}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "relative",
          filter: p.glow !== "transparent" ? `drop-shadow(0 0 ${tier === "legendary" ? 8 : 4}px ${p.glow}cc)` : "none",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id={`${uid}-outer`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.outer[0]} />
            <stop offset="100%" stopColor={p.outer[1]} />
          </linearGradient>
          <linearGradient id={`${uid}-inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.inner[0]} />
            <stop offset="100%" stopColor={p.inner[1]} />
          </linearGradient>
          {tier === "legendary" && (
            <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.0" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.0" />
            </linearGradient>
          )}
        </defs>

        {/* Outer flame body */}
        <g className={flickerClass}>
          <path
            d="M16 1
               C 19 7, 25 10, 25 19
               C 25 28, 21 34, 16 39
               C 11 34, 7 28, 7 19
               C 7 13, 11 11, 12 6
               C 13 9, 15 10, 16 13
               C 16.5 9, 16 5, 16 1 Z"
            fill={`url(#${uid}-outer)`}
          />
          {/* Inner flame */}
          <path
            d="M16 11
               C 18 15, 20.5 17, 20.5 23
               C 20.5 29, 18 33, 16 36
               C 14 33, 11.5 29, 11.5 23
               C 11.5 19, 13.5 17, 14 14
               C 14.5 16, 15.5 16.5, 16 18
               C 16.2 15, 16 13, 16 11 Z"
            fill={`url(#${uid}-inner)`}
          />
          {/* Hot core */}
          <ellipse cx="16" cy="29" rx="3.1" ry="5" fill={p.core} opacity={tier === "dead" ? 0.4 : 0.95} />

          {/* Legendary diagonal shine sweep */}
          {tier === "legendary" && (
            <rect x="2" y="0" width="6" height="40" fill={`url(#${uid}-shine)`} opacity="0.7">
              {animated && (
                <animate attributeName="x" from="-8" to="30" dur="2.4s" repeatCount="indefinite" />
              )}
            </rect>
          )}
        </g>

        {/* Rising embers */}
        {p.embers && animated && (
          <g>
            <circle className="flame-ember" cx="11" cy="20" r="1.1" fill={p.core} style={{ animationDelay: "0s" }} />
            <circle className="flame-ember" cx="21" cy="24" r="0.9" fill={p.outer[0]} style={{ animationDelay: "0.6s" }} />
            <circle className="flame-ember" cx="16" cy="16" r="1.3" fill={p.core} style={{ animationDelay: "1.1s" }} />
          </g>
        )}
      </svg>
    </span>
  );
}

/** A horizontal cluster of flames sized to the tier (1–5 flames, escalating). */
export function FlameCluster({
  tier,
  count,
  size = 34,
  animated = true,
}: { tier: FlameTier; count: number; size?: number; animated?: boolean }) {
  const flames = Array.from({ length: Math.max(1, count) });
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: size * -0.12 }}>
      {flames.map((_, i) => {
        // center flame largest, taper outward
        const mid = (flames.length - 1) / 2;
        const scale = 1 - Math.abs(i - mid) * 0.16;
        return (
          <FlameIcon
            key={i}
            tier={tier}
            size={Math.round(size * scale)}
            animated={animated}
          />
        );
      })}
    </span>
  );
}

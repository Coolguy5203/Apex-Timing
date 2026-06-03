"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

export interface CarStats {
  powertrain: number;   // 0-100
  frontAero: number;
  rearAero: number;
  frontSuspension: number;
  rearSuspension: number;
  chassis: number;
  cooling: number;
  braking: number;
}

interface Component {
  id: keyof CarStats;
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
}

const COMPONENTS: Component[] = [
  {
    id: "frontAero",
    label: "FRONT AERO",
    shortLabel: "FRONT",
    description: "Downforce generation at the front axle",
    detail: "Controls front-end grip under braking and through high-speed corners. Higher values indicate greater aerodynamic load — a full front wing on open-wheelers, a splitter and dive planes on closed cars.",
  },
  {
    id: "frontSuspension",
    label: "FRONT SUSPENSION",
    shortLabel: "F. SUSP",
    description: "Mechanical grip and handling balance",
    detail: "Determines how consistently the car behaves across different driver inputs. High consistency in lap time distribution indicates a well-sorted front setup.",
  },
  {
    id: "chassis",
    label: "CHASSIS / COCKPIT",
    shortLabel: "CHASSIS",
    description: "Driver environment and structural rigidity",
    detail: "Reflects how accessible and trusted this car is across the driver pool. A larger driver count signals confidence in the platform.",
  },
  {
    id: "powertrain",
    label: "POWERTRAIN",
    shortLabel: "ENGINE",
    description: "Power output and drivetrain efficiency",
    detail: "Derived from how this car's best lap compares to class benchmarks. Higher scores indicate more competitive outright pace.",
  },
  {
    id: "cooling",
    label: "COOLING SYSTEM",
    shortLabel: "COOLING",
    description: "Thermal management and reliability",
    detail: "Measured by the ratio of valid to total submissions. A high score means clean, reliable laps with minimal flagged or suspicious entries.",
  },
  {
    id: "braking",
    label: "BRAKING SYSTEM",
    shortLabel: "BRAKES",
    description: "Deceleration performance under load",
    detail: "Estimated from the car's versatility across different circuit types. Cars that perform well at stop-and-go circuits score higher.",
  },
  {
    id: "rearSuspension",
    label: "REAR SUSPENSION",
    shortLabel: "R. SUSP",
    description: "Rear stability and traction",
    detail: "Reflects how stable lap times are across different drivers. Low variance in times indicates predictable, well-balanced rear behaviour.",
  },
  {
    id: "rearAero",
    label: "REAR AERO",
    shortLabel: "REAR",
    description: "Downforce and drag balance at the rear",
    detail: "Mirrors the front aero philosophy — a towering wing on prototypes and open-wheelers, a modest wing on GTs, or a low spoiler lip on stock cars.",
  },
];

function ratingColor(v: number) {
  if (v >= 80) return "#22c55e";   // green
  if (v >= 60) return "#b84fff";   // purple
  if (v >= 40) return "#f59e0b";   // amber
  return "#ef4444";                 // red
}

function ratingLabel(v: number) {
  if (v >= 85) return "OPTIMAL";
  if (v >= 70) return "NOMINAL";
  if (v >= 50) return "MARGINAL";
  if (v >= 30) return "DEGRADED";
  return "CRITICAL";
}

// ── Car body archetype detection ──────────────────────────────────────────────

type Archetype = "openwheel" | "prototype" | "gt" | "stock";

function getArchetype(carClass: string): Archetype {
  const c = (carClass || "").toLowerCase();
  // Prototypes (closed cockpit, covered wheels, big wing) — check before GT so "GTP" lands here
  if (/(lmp|prototype|hypercar|dpi|lmdh|lmh|gtp|sports?\s*proto|radical|proto)/.test(c)) return "prototype";
  // Stock cars (boxy sedans)
  if (/(nascar|stock|cup series|xfinity|truck|late\s*model|legends)/.test(c)) return "stock";
  // Open-wheel single seaters
  if (/(formula|\bf1\b|\bf2\b|\bf3\b|\bf4\b|fr2|frx|indy|open[\s-]?wheel|single[\s-]?seat|skip\s*barber|dallara|super\s*formula|\bkart\b|sprint|midget|dirt)/.test(c)) return "openwheel";
  // GT / touring / road — closed coupe body
  if (/(gt|gte|gt2|gt3|gt4|touring|tcr|\btc\b|supercar|production|street|road|rally|cup\b|porsche|ferrari|spec\s*racer|mx-?5|miata)/.test(c)) return "gt";
  return "gt"; // default: closed-body coupe
}

function archetypeLabel(a: Archetype): string {
  switch (a) {
    case "openwheel": return "OPEN-WHEEL";
    case "prototype": return "PROTOTYPE";
    case "stock":     return "STOCK CAR";
    case "gt":        return "GT / CLOSED";
  }
}

interface RatingBarProps { value: number; label: string; active: boolean; onClick: () => void }

function RatingBar({ value, label, active, onClick }: RatingBarProps) {
  const color = ratingColor(value);
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
        active ? "bg-race-muted border border-neon-purple/30" : "hover:bg-race-muted/50"
      )}
    >
      <span className="text-[10px] font-mono text-race-dim w-14 flex-shrink-0 tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 bg-race-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold w-7 text-right flex-shrink-0" style={{ color }}>
        {value}
      </span>
    </button>
  );
}

// ── SVG zone primitives ───────────────────────────────────────────────────────

interface ZoneProps {
  active: boolean;
  hovered: boolean;
  value: number;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}

function zoneStyle(active: boolean, hovered: boolean, value: number) {
  const color = ratingColor(value);
  const opacity = active ? 0.35 : hovered ? 0.2 : 0.08;
  return {
    fill: color,
    fillOpacity: opacity,
    stroke: color,
    strokeOpacity: active || hovered ? 0.9 : 0.3,
    strokeWidth: active ? 1.5 : 1,
    filter: (active || hovered) ? `drop-shadow(0 0 6px ${color})` : "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as const;
}

const zs = (s: ZoneProps) => zoneStyle(s.active, s.hovered, s.value);
const zc = (s: ZoneProps) => ratingColor(s.value);
const lineOp = (s: ZoneProps) => (s.active || s.hovered ? 0.7 : 0.2);

type Zfn = (id: keyof CarStats) => ZoneProps;

// Interactive zone group wrapper (render-prop gives access to the zone state)
function Z({ z, id, children }: { z: Zfn; id: keyof CarStats; children: (s: ZoneProps) => ReactNode }) {
  const s = z(id);
  return (
    <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
      {children(s)}
    </g>
  );
}

const BODY_FILL = "rgba(15,10,25,0.65)";
const BODY_STROKE = "rgba(184,79,255,0.2)";
const PANEL_FILL = "rgba(15,10,25,0.85)";

function ductLines(xFrom: number, xTo: number, ys: number[], s: ZoneProps, slope = -4) {
  return ys.map((y) => (
    <line key={y} x1={xFrom} y1={y} x2={xTo} y2={y + slope}
      stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
  ));
}

// ── 1. OPEN-WHEEL (F1 / IndyCar / Formula) ─────────────────────────────────────

function OpenWheelBody({ z }: { z: Zfn }) {
  return (
    <>
      {/* Narrow monocoque tub */}
      <path
        d="M 100 70 L 180 70 L 195 90 L 210 90 L 215 130 L 210 140 L 215 280 L 210 310 L 195 330 L 180 345 L 180 380 L 100 380 L 100 345 L 85 330 L 70 310 L 65 280 L 70 140 L 65 130 L 65 90 L 80 90 Z"
        fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1" />

      {/* FRONT WING */}
      <Z z={z} id="frontAero">{(s) => (<>
        <rect x="25" y="18" width="230" height="38" rx="6" style={zs(s)} />
        <text x="140" y="41" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace" letterSpacing="2">FRONT WING</text>
        <rect x="20" y="22" width="12" height="28" rx="3" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <rect x="248" y="22" width="12" height="28" rx="3" style={{ ...zs(s), fillOpacity: 0.5 }} />
      </>)}</Z>

      {/* Nose */}
      <path d="M 120 57 L 160 57 L 175 90 L 105 90 Z" fill={PANEL_FILL} stroke="rgba(184,79,255,0.15)" strokeWidth="1" />

      {/* FRONT SUSPENSION — exposed wheels */}
      <Z z={z} id="frontSuspension">{(s) => (<>
        <ellipse cx="52" cy="118" rx="22" ry="26" style={zs(s)} />
        <ellipse cx="228" cy="118" rx="22" ry="26" style={zs(s)} />
        <path d="M 74 108 L 108 102 M 74 128 L 108 120" stroke={zc(s)} strokeOpacity={lineOp(s) + 0.1} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
        <path d="M 206 102 L 172 102 M 206 120 L 172 120" stroke={zc(s)} strokeOpacity={lineOp(s) + 0.1} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
      </>)}</Z>

      {/* CHASSIS / COCKPIT */}
      <Z z={z} id="chassis">{(s) => (<>
        <rect x="100" y="92" width="80" height="85" rx="10" style={zs(s)} />
        <ellipse cx="140" cy="132" rx="22" ry="28" fill="rgba(5,3,10,0.9)" stroke={zc(s)} strokeOpacity="0.4" strokeWidth="1" />
        <text x="140" y="170" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="1">COCKPIT</text>
      </>)}</Z>

      {/* Sidepods (static) */}
      <path d="M 68 138 L 100 130 L 100 290 L 68 282 Z" fill="rgba(15,10,25,0.7)" stroke="rgba(184,79,255,0.12)" strokeWidth="1" />
      <path d="M 212 138 L 180 130 L 180 290 L 212 282 Z" fill="rgba(15,10,25,0.7)" stroke="rgba(184,79,255,0.12)" strokeWidth="1" />

      {/* COOLING (left sidepod) */}
      <Z z={z} id="cooling">{(s) => (<>
        <path d="M 68 150 L 98 142 L 98 250 L 68 242 Z" style={zs(s)} />
        {ductLines(70, 96, [160, 178, 196, 214, 232], s)}
      </>)}</Z>

      {/* POWERTRAIN (engine cover) */}
      <Z z={z} id="powertrain">{(s) => (<>
        <rect x="105" y="188" width="70" height="92" rx="8" style={zs(s)} />
        <line x1="115" y1="210" x2="165" y2="210" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="115" y1="234" x2="165" y2="234" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="115" y1="258" x2="165" y2="258" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <text x="140" y="248" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace" letterSpacing="1">ENGINE</text>
      </>)}</Z>

      {/* BRAKING (right sidepod) */}
      <Z z={z} id="braking">{(s) => (<>
        <path d="M 212 150 L 182 142 L 182 250 L 212 242 Z" style={zs(s)} />
        {ductLines(210, 184, [160, 178, 196, 214, 232], s)}
      </>)}</Z>

      {/* REAR SUSPENSION — exposed wheels */}
      <Z z={z} id="rearSuspension">{(s) => (<>
        <ellipse cx="52" cy="342" rx="24" ry="28" style={zs(s)} />
        <ellipse cx="228" cy="342" rx="24" ry="28" style={zs(s)} />
        <path d="M 76 332 L 100 322 M 76 352 L 100 342" stroke={zc(s)} strokeOpacity={lineOp(s) + 0.1} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
        <path d="M 204 322 L 180 322 M 204 342 L 180 342" stroke={zc(s)} strokeOpacity={lineOp(s) + 0.1} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
      </>)}</Z>

      {/* Diffuser (static) */}
      <path d="M 95 383 L 185 383 L 190 400 L 90 400 Z" fill={PANEL_FILL} stroke="rgba(184,79,255,0.15)" strokeWidth="1" />

      {/* REAR WING — tall */}
      <Z z={z} id="rearAero">{(s) => (<>
        <rect x="28" y="408" width="224" height="34" rx="5" style={zs(s)} />
        <rect x="125" y="385" width="10" height="25" rx="2" style={{ ...zs(s), fillOpacity: 0.4 }} />
        <rect x="145" y="385" width="10" height="25" rx="2" style={{ ...zs(s), fillOpacity: 0.4 }} />
        <rect x="22" y="402" width="12" height="44" rx="3" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <rect x="246" y="402" width="12" height="44" rx="3" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <text x="140" y="430" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace" letterSpacing="2">REAR WING</text>
      </>)}</Z>
    </>
  );
}

// ── 2. PROTOTYPE (LMP / GTP / Hypercar) ─────────────────────────────────────────

function PrototypeBody({ z }: { z: Zfn }) {
  return (
    <>
      {/* Sleek closed teardrop body, covered wheels */}
      <path
        d="M 140 40 C 168 46 200 74 205 126 C 207 156 196 172 193 198 C 201 256 206 300 196 350 C 189 376 166 394 140 396 C 114 394 91 376 84 350 C 74 300 79 256 87 198 C 84 172 73 156 75 126 C 80 74 112 46 140 40 Z"
        fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />

      {/* FRONT SPLITTER + dive planes */}
      <Z z={z} id="frontAero">{(s) => (<>
        <path d="M 96 52 Q 140 40 184 52 L 180 70 Q 140 60 100 70 Z" style={zs(s)} />
        <rect x="74" y="58" width="14" height="24" rx="3" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <rect x="192" y="58" width="14" height="24" rx="3" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <text x="140" y="34" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontFamily="monospace" letterSpacing="1">SPLITTER</text>
      </>)}</Z>

      {/* FRONT SUSPENSION — covered front wheels (fender bulges) */}
      <Z z={z} id="frontSuspension">{(s) => (<>
        <ellipse cx="80" cy="130" rx="19" ry="30" style={zs(s)} />
        <ellipse cx="200" cy="130" rx="19" ry="30" style={zs(s)} />
        <path d="M 96 124 L 112 120 M 96 140 L 112 136" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1.3" fill="none" strokeDasharray="3,2" />
        <path d="M 184 120 L 168 120 M 184 136 L 168 136" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1.3" fill="none" strokeDasharray="3,2" />
      </>)}</Z>

      {/* CHASSIS / cockpit canopy */}
      <Z z={z} id="chassis">{(s) => (<>
        <path d="M 112 150 Q 140 142 168 150 L 162 218 Q 140 226 118 218 Z" style={zs(s)} />
        <ellipse cx="140" cy="184" rx="20" ry="30" fill="rgba(5,3,10,0.9)" stroke={zc(s)} strokeOpacity="0.4" strokeWidth="1" />
        <text x="140" y="236" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="1">CANOPY</text>
      </>)}</Z>

      {/* COOLING — left radiator intake */}
      <Z z={z} id="cooling">{(s) => (<>
        <path d="M 86 224 L 106 230 L 106 300 L 88 294 Z" style={zs(s)} />
        {ductLines(90, 104, [238, 254, 270, 286], s)}
      </>)}</Z>

      {/* BRAKING — right intake */}
      <Z z={z} id="braking">{(s) => (<>
        <path d="M 194 224 L 174 230 L 174 300 L 192 294 Z" style={zs(s)} />
        {ductLines(190, 176, [238, 254, 270, 286], s)}
      </>)}</Z>

      {/* POWERTRAIN — engine cover + shark fin */}
      <Z z={z} id="powertrain">{(s) => (<>
        <rect x="110" y="248" width="60" height="86" rx="12" style={zs(s)} />
        <path d="M 138 250 L 142 250 L 144 330 L 136 330 Z" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <line x1="120" y1="272" x2="160" y2="272" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="120" y1="296" x2="160" y2="296" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <text x="140" y="320" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace" letterSpacing="1">ENGINE</text>
      </>)}</Z>

      {/* REAR SUSPENSION — covered rear wheels */}
      <Z z={z} id="rearSuspension">{(s) => (<>
        <ellipse cx="74" cy="338" rx="20" ry="30" style={zs(s)} />
        <ellipse cx="206" cy="338" rx="20" ry="30" style={zs(s)} />
        <path d="M 92 332 L 110 328 M 92 348 L 110 344" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1.3" fill="none" strokeDasharray="3,2" />
        <path d="M 188 328 L 170 328 M 188 344 L 170 344" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1.3" fill="none" strokeDasharray="3,2" />
      </>)}</Z>

      {/* Diffuser (static) */}
      <path d="M 98 392 L 182 392 L 188 410 L 92 410 Z" fill={PANEL_FILL} stroke="rgba(184,79,255,0.15)" strokeWidth="1" />

      {/* REAR WING — large LMP swan-neck */}
      <Z z={z} id="rearAero">{(s) => (<>
        <rect x="30" y="416" width="220" height="30" rx="5" style={zs(s)} />
        <rect x="118" y="396" width="9" height="22" rx="2" style={{ ...zs(s), fillOpacity: 0.4 }} />
        <rect x="153" y="396" width="9" height="22" rx="2" style={{ ...zs(s), fillOpacity: 0.4 }} />
        <rect x="24" y="410" width="12" height="42" rx="3" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <rect x="244" y="410" width="12" height="42" rx="3" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <text x="140" y="436" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace" letterSpacing="2">REAR WING</text>
      </>)}</Z>
    </>
  );
}

// ── 3. GT (GT3 / GT4 / closed coupe) ────────────────────────────────────────────

function GTBody({ z }: { z: Zfn }) {
  return (
    <>
      {/* Production coupe outline with fender bulges over all four wheels */}
      <path
        d="M 108 60 L 172 60 Q 196 62 202 92 Q 210 104 208 124 Q 214 134 210 150 L 210 300 Q 214 318 206 340 Q 202 372 184 392 L 172 400 L 108 400 L 96 392 Q 78 372 74 340 Q 66 318 70 300 L 70 150 Q 66 134 72 124 Q 70 104 78 92 Q 84 62 108 60 Z"
        fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />

      {/* FRONT SPLITTER / bumper */}
      <Z z={z} id="frontAero">{(s) => (<>
        <path d="M 92 50 Q 140 42 188 50 L 186 66 Q 140 58 94 66 Z" style={zs(s)} />
        <text x="140" y="36" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontFamily="monospace" letterSpacing="1">SPLITTER</text>
      </>)}</Z>

      {/* POWERTRAIN — front hood + louvres */}
      <Z z={z} id="powertrain">{(s) => (<>
        <rect x="98" y="74" width="84" height="60" rx="10" style={zs(s)} />
        <line x1="110" y1="92" x2="170" y2="92" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="110" y1="106" x2="170" y2="106" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="110" y1="120" x2="170" y2="120" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <text x="140" y="128" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace" letterSpacing="1">ENGINE</text>
      </>)}</Z>

      {/* COOLING — left front intake */}
      <Z z={z} id="cooling">{(s) => (<>
        <path d="M 80 96 L 96 100 L 96 132 L 82 128 Z" style={zs(s)} />
        {ductLines(83, 94, [104, 114, 124], s, -2)}
      </>)}</Z>

      {/* BRAKING — right front intake */}
      <Z z={z} id="braking">{(s) => (<>
        <path d="M 200 96 L 184 100 L 184 132 L 198 128 Z" style={zs(s)} />
        {ductLines(197, 186, [104, 114, 124], s, -2)}
      </>)}</Z>

      {/* FRONT SUSPENSION — front fenders */}
      <Z z={z} id="frontSuspension">{(s) => (<>
        <ellipse cx="80" cy="138" rx="17" ry="26" style={zs(s)} />
        <ellipse cx="200" cy="138" rx="17" ry="26" style={zs(s)} />
      </>)}</Z>

      {/* CHASSIS — greenhouse / roof */}
      <Z z={z} id="chassis">{(s) => (<>
        {/* windshield */}
        <path d="M 104 150 L 176 150 L 168 172 L 112 172 Z" style={{ ...zs(s), fillOpacity: (s.active ? 0.3 : s.hovered ? 0.18 : 0.06) }} />
        {/* roof */}
        <rect x="110" y="172" width="60" height="78" rx="8" style={zs(s)} />
        <ellipse cx="140" cy="200" rx="20" ry="24" fill="rgba(5,3,10,0.85)" stroke={zc(s)} strokeOpacity="0.4" strokeWidth="1" />
        <text x="140" y="244" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="1">COCKPIT</text>
      </>)}</Z>

      {/* Rear deck (static) */}
      <path d="M 96 256 L 184 256 L 184 340 L 96 340 Z" fill="rgba(15,10,25,0.55)" stroke="rgba(184,79,255,0.1)" strokeWidth="1" />

      {/* REAR SUSPENSION — rear fenders */}
      <Z z={z} id="rearSuspension">{(s) => (<>
        <ellipse cx="78" cy="330" rx="18" ry="28" style={zs(s)} />
        <ellipse cx="202" cy="330" rx="18" ry="28" style={zs(s)} />
      </>)}</Z>

      {/* REAR WING — modest GT wing */}
      <Z z={z} id="rearAero">{(s) => (<>
        <rect x="48" y="404" width="184" height="24" rx="4" style={zs(s)} />
        <rect x="120" y="388" width="8" height="18" rx="2" style={{ ...zs(s), fillOpacity: 0.45 }} />
        <rect x="152" y="388" width="8" height="18" rx="2" style={{ ...zs(s), fillOpacity: 0.45 }} />
        <rect x="42" y="400" width="10" height="32" rx="2" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <rect x="228" y="400" width="10" height="32" rx="2" style={{ ...zs(s), fillOpacity: 0.6 }} />
        <text x="140" y="420" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace" letterSpacing="2">REAR WING</text>
      </>)}</Z>
    </>
  );
}

// ── 4. STOCK CAR (NASCAR / boxy sedan) ──────────────────────────────────────────

function StockBody({ z }: { z: Zfn }) {
  return (
    <>
      {/* Boxy sedan shell */}
      <path
        d="M 88 58 L 192 58 Q 208 62 210 92 L 212 320 Q 210 360 196 386 L 184 398 L 96 398 L 84 386 Q 70 360 68 320 L 70 92 Q 72 62 88 58 Z"
        fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth="1.2" />

      {/* FRONT AIR DAM / splitter */}
      <Z z={z} id="frontAero">{(s) => (<>
        <path d="M 86 48 Q 140 40 194 48 L 192 64 Q 140 56 88 64 Z" style={zs(s)} />
        <text x="140" y="34" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontFamily="monospace" letterSpacing="1">AIR DAM</text>
      </>)}</Z>

      {/* COOLING — left grille */}
      <Z z={z} id="cooling">{(s) => (<>
        <rect x="92" y="70" width="22" height="34" rx="3" style={zs(s)} />
        {ductLines(95, 111, [78, 88, 98], s, 0)}
      </>)}</Z>

      {/* BRAKING — right grille */}
      <Z z={z} id="braking">{(s) => (<>
        <rect x="166" y="70" width="22" height="34" rx="3" style={zs(s)} />
        {ductLines(169, 185, [78, 88, 98], s, 0)}
      </>)}</Z>

      {/* POWERTRAIN — big front hood (V8) */}
      <Z z={z} id="powertrain">{(s) => (<>
        <rect x="100" y="110" width="80" height="62" rx="6" style={zs(s)} />
        <line x1="140" y1="116" x2="140" y2="166" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="116" y1="128" x2="164" y2="128" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <line x1="116" y1="148" x2="164" y2="148" stroke={zc(s)} strokeOpacity={lineOp(s)} strokeWidth="1" />
        <text x="140" y="190" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace" letterSpacing="1">V8</text>
      </>)}</Z>

      {/* FRONT SUSPENSION — front fenders */}
      <Z z={z} id="frontSuspension">{(s) => (<>
        <ellipse cx="80" cy="140" rx="16" ry="28" style={zs(s)} />
        <ellipse cx="200" cy="140" rx="16" ry="28" style={zs(s)} />
      </>)}</Z>

      {/* CHASSIS — upright greenhouse */}
      <Z z={z} id="chassis">{(s) => (<>
        <path d="M 106 196 L 174 196 L 168 216 L 112 216 Z" style={{ ...zs(s), fillOpacity: (s.active ? 0.3 : s.hovered ? 0.18 : 0.06) }} />
        <rect x="110" y="216" width="60" height="74" rx="6" style={zs(s)} />
        <ellipse cx="140" cy="246" rx="18" ry="22" fill="rgba(5,3,10,0.85)" stroke={zc(s)} strokeOpacity="0.4" strokeWidth="1" />
        <text x="140" y="284" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="1">CAGE</text>
      </>)}</Z>

      {/* Rear deck (static) */}
      <path d="M 96 296 L 184 296 L 184 360 L 96 360 Z" fill="rgba(15,10,25,0.55)" stroke="rgba(184,79,255,0.1)" strokeWidth="1" />

      {/* REAR SUSPENSION — rear fenders */}
      <Z z={z} id="rearSuspension">{(s) => (<>
        <ellipse cx="80" cy="346" rx="16" ry="28" style={zs(s)} />
        <ellipse cx="200" cy="346" rx="16" ry="28" style={zs(s)} />
      </>)}</Z>

      {/* REAR SPOILER — low flat lip (not a wing) */}
      <Z z={z} id="rearAero">{(s) => (<>
        <rect x="84" y="392" width="112" height="16" rx="3" style={zs(s)} />
        <rect x="84" y="384" width="6" height="14" rx="2" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <rect x="190" y="384" width="6" height="14" rx="2" style={{ ...zs(s), fillOpacity: 0.5 }} />
        <text x="140" y="404" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace" letterSpacing="1">SPOILER</text>
      </>)}</Z>
    </>
  );
}

// ── SVG container ───────────────────────────────────────────────────────────────

interface CarSVGProps {
  stats: CarStats;
  archetype: Archetype;
  activeId: keyof CarStats | null;
  hoveredId: keyof CarStats | null;
  onZoneClick: (id: keyof CarStats) => void;
  onZoneEnter: (id: keyof CarStats) => void;
  onZoneLeave: () => void;
}

function CarSVG({ stats, archetype, activeId, hoveredId, onZoneClick, onZoneEnter, onZoneLeave }: CarSVGProps) {
  const z: Zfn = (id) => ({
    active: activeId === id,
    hovered: hoveredId === id,
    value: stats[id],
    onClick: () => onZoneClick(id),
    onEnter: () => onZoneEnter(id),
    onLeave: onZoneLeave,
  });

  return (
    <svg viewBox="0 0 280 500" className="w-full max-w-[260px] mx-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(184,79,255,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="500" fill="url(#grid)" />

      {archetype === "openwheel" && <OpenWheelBody z={z} />}
      {archetype === "prototype" && <PrototypeBody z={z} />}
      {archetype === "gt" && <GTBody z={z} />}
      {archetype === "stock" && <StockBody z={z} />}

      {/* Center axis line */}
      <line x1="140" y1="10" x2="140" y2="490" stroke="rgba(184,79,255,0.08)" strokeWidth="1" strokeDasharray="4,6" />
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface CarXrayProps {
  stats: CarStats;
  carName: string;
  carClass: string;
}

export function CarXray({ stats, carName, carClass }: CarXrayProps) {
  const [activeId, setActiveId] = useState<keyof CarStats | null>(null);
  const [hoveredId, setHoveredId] = useState<keyof CarStats | null>(null);

  const archetype = getArchetype(carClass);

  const displayId = activeId ?? hoveredId;
  const display = displayId ? COMPONENTS.find(c => c.id === displayId) : null;
  const displayValue = displayId ? stats[displayId] : null;

  const handleZoneClick = (id: keyof CarStats) => {
    setActiveId(prev => prev === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* SVG Car */}
      <div className="race-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-mono text-race-dim/50 tracking-widest">TECHNICAL SCHEMATIC</p>
            <p className="text-[10px] font-mono text-neon-purple tracking-widest font-bold">{archetypeLabel(archetype)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-race-dim/50">{carClass.toUpperCase()}</p>
            <p className="text-[9px] font-mono text-race-dim/30">APEX TIMING</p>
          </div>
        </div>

        <CarSVG
          stats={stats}
          archetype={archetype}
          activeId={activeId}
          hoveredId={hoveredId}
          onZoneClick={handleZoneClick}
          onZoneEnter={setHoveredId}
          onZoneLeave={() => setHoveredId(null)}
        />

        <p className="text-[9px] font-mono text-race-dim/40 text-center mt-2 tracking-widest">
          CLICK COMPONENT TO INSPECT
        </p>
      </div>

      {/* Right panel */}
      <div className="space-y-4">
        {/* Selected component detail */}
        <div className={clsx(
          "race-card p-5 transition-all duration-300 min-h-[120px]",
          display ? "border-neon-purple/30" : "border-race-border"
        )}>
          {display && displayValue !== null ? (
            <>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-display font-black text-race-text tracking-widest text-lg">
                    {display.label}
                  </p>
                  <p className="text-race-dim text-xs font-mono mt-0.5">{display.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-display font-black" style={{ color: ratingColor(displayValue) }}>
                    {displayValue}
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-widest" style={{ color: ratingColor(displayValue) }}>
                    {ratingLabel(displayValue)}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-race-dark rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${displayValue}%`,
                    background: `linear-gradient(90deg, ${ratingColor(displayValue)}88, ${ratingColor(displayValue)})`,
                    boxShadow: `0 0 12px ${ratingColor(displayValue)}60`,
                  }}
                />
              </div>
              <p className="text-race-dim/70 text-xs font-mono leading-relaxed">{display.detail}</p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-4">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-race-dim text-xs font-mono text-center tracking-widest">
                SELECT A COMPONENT TO VIEW DIAGNOSTICS
              </p>
            </div>
          )}
        </div>

        {/* All ratings */}
        <div className="race-card p-4">
          <p className="section-label mb-3">SYSTEM OVERVIEW</p>
          <div className="space-y-1">
            {COMPONENTS.map((comp) => (
              <RatingBar
                key={comp.id}
                label={comp.shortLabel}
                value={stats[comp.id]}
                active={activeId === comp.id}
                onClick={() => handleZoneClick(comp.id)}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="race-card p-3 grid grid-cols-4 gap-2">
          {[
            { label: "OPTIMAL", color: "#22c55e", range: "85–100" },
            { label: "NOMINAL", color: "#b84fff", range: "60–84" },
            { label: "MARGINAL", color: "#f59e0b", range: "30–59" },
            { label: "CRITICAL", color: "#ef4444", range: "0–29" },
          ].map(({ label, color, range }) => (
            <div key={label} className="text-center">
              <div className="w-full h-1 rounded-full mb-1" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              <p className="text-[9px] font-mono font-bold" style={{ color }}>{label}</p>
              <p className="text-[9px] font-mono text-race-dim/50">{range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

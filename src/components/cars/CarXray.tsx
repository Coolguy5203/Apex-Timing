"use client";

import { useState } from "react";
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
    shortLabel: "FRONT WING",
    description: "Downforce generation at the front axle",
    detail: "Controls front-end grip under braking and through high-speed corners. Higher values indicate greater aerodynamic load and ground effect pressure.",
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
    shortLabel: "REAR WING",
    description: "Downforce and drag balance at the rear",
    detail: "Mirrors the front aero philosophy — high values indicate significant rear downforce typical of open-wheel and prototype machinery.",
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

// ── SVG Car Diagram ──────────────────────────────────────────────────────────

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
  };
}

interface CarSVGProps {
  stats: CarStats;
  activeId: keyof CarStats | null;
  hoveredId: keyof CarStats | null;
  onZoneClick: (id: keyof CarStats) => void;
  onZoneEnter: (id: keyof CarStats) => void;
  onZoneLeave: () => void;
}

function CarSVG({ stats, activeId, hoveredId, onZoneClick, onZoneEnter, onZoneLeave }: CarSVGProps) {
  const z = (id: keyof CarStats): ZoneProps => ({
    active: activeId === id,
    hovered: hoveredId === id,
    value: stats[id],
    onClick: () => onZoneClick(id),
    onEnter: () => onZoneEnter(id),
    onLeave: onZoneLeave,
  });

  return (
    <svg viewBox="0 0 280 500" className="w-full max-w-[260px] mx-auto" xmlns="http://www.w3.org/2000/svg">
      {/* Blueprint grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(184,79,255,0.06)" strokeWidth="0.5"/>
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="280" height="500" fill="url(#grid)" />

      {/* ── Car body base outline ── */}
      {/* Main body */}
      <path
        d="M 100 70 L 180 70 L 195 90 L 210 90 L 215 130 L 210 140 L 215 280 L 210 310 L 195 330 L 180 345 L 180 380 L 100 380 L 100 345 L 85 330 L 70 310 L 65 280 L 70 140 L 65 130 L 65 90 L 80 90 Z"
        fill="rgba(15,10,25,0.6)"
        stroke="rgba(184,79,255,0.2)"
        strokeWidth="1"
      />

      {/* ── FRONT WING zone ── */}
      {(() => { const s = z("frontAero"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          <rect x="25" y="18" width="230" height="38" rx="6"
            style={zoneStyle(s.active, s.hovered, s.value)} />
          <text x="140" y="41" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace" letterSpacing="2">FRONT WING</text>
          {/* endplates */}
          <rect x="20" y="22" width="12" height="28" rx="3" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.6 }} />
          <rect x="248" y="22" width="12" height="28" rx="3" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.6 }} />
        </g>
      ); })()}

      {/* Nose section */}
      <path d="M 120 57 L 160 57 L 175 90 L 105 90 Z"
        fill="rgba(15,10,25,0.8)" stroke="rgba(184,79,255,0.15)" strokeWidth="1" />

      {/* ── FRONT SUSPENSION (left+right) zone ── */}
      {(() => { const s = z("frontSuspension"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          {/* Left front tire */}
          <ellipse cx="52" cy="118" rx="22" ry="26" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Right front tire */}
          <ellipse cx="228" cy="118" rx="22" ry="26" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Left wishbone */}
          <path d="M 74 108 L 108 102 M 74 128 L 108 120" stroke={ratingColor(s.value)}
            strokeOpacity={s.active || s.hovered ? 0.8 : 0.3} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
          {/* Right wishbone */}
          <path d="M 206 102 L 172 102 M 206 120 L 172 120" stroke={ratingColor(s.value)}
            strokeOpacity={s.active || s.hovered ? 0.8 : 0.3} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
        </g>
      ); })()}

      {/* ── CHASSIS / COCKPIT zone ── */}
      {(() => { const s = z("chassis"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          <rect x="100" y="92" width="80" height="85" rx="10" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Cockpit opening */}
          <ellipse cx="140" cy="132" rx="22" ry="28"
            fill="rgba(5,3,10,0.9)" stroke={ratingColor(s.value)} strokeOpacity="0.4" strokeWidth="1" />
          <text x="140" y="170" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace" letterSpacing="1">COCKPIT</text>
        </g>
      ); })()}

      {/* Sidepods */}
      <path d="M 68 138 L 100 130 L 100 290 L 68 282 Z"
        fill="rgba(15,10,25,0.7)" stroke="rgba(184,79,255,0.12)" strokeWidth="1" />
      <path d="M 212 138 L 180 130 L 180 290 L 212 282 Z"
        fill="rgba(15,10,25,0.7)" stroke="rgba(184,79,255,0.12)" strokeWidth="1" />

      {/* ── COOLING zone (left sidepod) ── */}
      {(() => { const s = z("cooling"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          <path d="M 68 150 L 98 142 L 98 250 L 68 242 Z" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Cooling vents */}
          {[160, 178, 196, 214, 232].map(y => (
            <line key={y} x1="70" y1={y} x2="96" y2={y-4}
              stroke={ratingColor(s.value)} strokeOpacity={s.active || s.hovered ? 0.7 : 0.2}
              strokeWidth="1" />
          ))}
        </g>
      ); })()}

      {/* ── POWERTRAIN zone (engine cover) ── */}
      {(() => { const s = z("powertrain"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          <rect x="105" y="188" width="70" height="92" rx="8" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Engine detail lines */}
          <line x1="115" y1="210" x2="165" y2="210"
            stroke={ratingColor(s.value)} strokeOpacity={s.active || s.hovered ? 0.6 : 0.15} strokeWidth="1" />
          <line x1="115" y1="234" x2="165" y2="234"
            stroke={ratingColor(s.value)} strokeOpacity={s.active || s.hovered ? 0.6 : 0.15} strokeWidth="1" />
          <line x1="115" y1="258" x2="165" y2="258"
            stroke={ratingColor(s.value)} strokeOpacity={s.active || s.hovered ? 0.6 : 0.15} strokeWidth="1" />
          <text x="140" y="248" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace" letterSpacing="1">ENGINE</text>
        </g>
      ); })()}

      {/* ── BRAKING zone (right sidepod used as braking indicator) ── */}
      {(() => { const s = z("braking"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          <path d="M 212 150 L 182 142 L 182 250 L 212 242 Z" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Brake duct lines */}
          {[160, 178, 196, 214, 232].map(y => (
            <line key={y} x1="210" y1={y} x2="184" y2={y-4}
              stroke={ratingColor(s.value)} strokeOpacity={s.active || s.hovered ? 0.7 : 0.2}
              strokeWidth="1" />
          ))}
        </g>
      ); })()}

      {/* ── REAR SUSPENSION zone ── */}
      {(() => { const s = z("rearSuspension"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          {/* Left rear tire */}
          <ellipse cx="52" cy="342" rx="24" ry="28" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Right rear tire */}
          <ellipse cx="228" cy="342" rx="24" ry="28" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Wishbones */}
          <path d="M 76 332 L 100 322 M 76 352 L 100 342" stroke={ratingColor(s.value)}
            strokeOpacity={s.active || s.hovered ? 0.8 : 0.3} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
          <path d="M 204 322 L 180 322 M 204 342 L 180 342" stroke={ratingColor(s.value)}
            strokeOpacity={s.active || s.hovered ? 0.8 : 0.3} strokeWidth="1.5" fill="none" strokeDasharray="3,2" />
        </g>
      ); })()}

      {/* Diffuser */}
      <path d="M 95 383 L 185 383 L 190 400 L 90 400 Z"
        fill="rgba(15,10,25,0.8)" stroke="rgba(184,79,255,0.15)" strokeWidth="1" />

      {/* ── REAR AERO zone ── */}
      {(() => { const s = z("rearAero"); return (
        <g onClick={s.onClick} onMouseEnter={s.onEnter} onMouseLeave={s.onLeave}>
          {/* Main plane */}
          <rect x="28" y="408" width="224" height="34" rx="5" style={zoneStyle(s.active, s.hovered, s.value)} />
          {/* Swan neck / support */}
          <rect x="125" y="385" width="10" height="25" rx="2" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.5 }} />
          <rect x="145" y="385" width="10" height="25" rx="2" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.5 }} />
          {/* Endplates */}
          <rect x="22" y="402" width="12" height="44" rx="3" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.7 }} />
          <rect x="246" y="402" width="12" height="44" rx="3" style={{ ...zoneStyle(s.active, s.hovered, s.value), opacity: 0.7 }} />
          <text x="140" y="430" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace" letterSpacing="2">REAR WING</text>
        </g>
      ); })()}

      {/* Scan line overlay */}
      <rect width="280" height="500" fill="url(#scanlines)" opacity="0.03" />

      {/* Center axis line */}
      <line x1="140" y1="10" x2="140" y2="490"
        stroke="rgba(184,79,255,0.08)" strokeWidth="1" strokeDasharray="4,6" />
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

  const active = activeId ? COMPONENTS.find(c => c.id === activeId) : null;
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
        {/* Blueprint header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-mono text-race-dim/50 tracking-widest">TECHNICAL SCHEMATIC</p>
            <p className="text-[10px] font-mono text-neon-purple tracking-widest font-bold">{carClass.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-race-dim/50">REV 1.0</p>
            <p className="text-[9px] font-mono text-race-dim/30">APEX TIMING</p>
          </div>
        </div>

        <CarSVG
          stats={stats}
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
              {/* Rating bar */}
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

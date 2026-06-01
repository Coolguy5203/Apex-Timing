'use client';

import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import {
  DEFAULT_TIRE, parseTimeString, formatLapTimeSec, formatTotalTime,
  calcTotalLaps, generateStrategy, findUndercutWindows,
  type Tire, type Strategy,
} from '@/lib/endurance-strategy';

// ─── Driver colour palette (Apex Timing brand colours first) ───────────────
const DRIVER_COLORS = ['#b84fff', '#39ff14', '#ffd700', '#00d4ff', '#ff6b35', '#ff1493'];
function driverColor(n: number) { return DRIVER_COLORS[(n - 1) % DRIVER_COLORS.length]; }

function pitLabel(ps: Strategy['stints'][0]['pitService']): string {
  if (!ps) return '';
  const p: string[] = [];
  if (ps.tireChange) p.push('T');
  if (ps.fuelAdded > 0) p.push('F');
  if (ps.driverSwap) p.push('DS');
  return p.join('+');
}

// ─── Input style helpers ──────────────────────────────────────────────────
const inputCls = 'w-full bg-race-dark text-race-text rounded-lg px-3 py-2 border border-race-border text-sm font-mono focus:border-neon-purple focus:outline-none transition-colors';
const labelCls = 'text-xs text-race-dim font-mono tracking-widest block mb-1';
const cardCls  = 'bg-race-card border border-race-border rounded-xl p-4';

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-mono font-bold text-race-dim uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

// ─── Lap time tooltip for Recharts ───────────────────────────────────────
function LapTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-race-card border border-race-border rounded-lg p-3 text-xs shadow-2xl">
      <p className="text-race-dim font-mono mb-2 tracking-widest">LAP {label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-race-text font-mono">{formatLapTimeSec(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function FuelTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-race-card border border-race-border rounded-lg p-3 text-xs shadow-2xl">
      <p className="text-race-dim font-mono mb-2 tracking-widest">LAP {label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-race-text font-mono">{entry.value?.toFixed(1)} laps fuel</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function StrategyPage() {
  // Race info
  const [trackName, setTrackName]           = useState('Daytona International Speedway');
  const [raceDurationHours, setRaceDurationHours] = useState(2.5);
  const [avgLapTimeStr, setAvgLapTimeStr]   = useState('1:30.000');

  // Tire
  const [tire, setTire]                     = useState<Tire>(DEFAULT_TIRE);
  const [editingTire, setEditingTire]       = useState(false);
  const [baselineStr, setBaselineStr]       = useState('');

  // Fuel
  const [fuelTankLaps, setFuelTankLaps]     = useState(35);
  const [fuelEffect, setFuelEffect]         = useState(0.03);

  // Pit service
  const [fixedServiceTime, setFixedServiceTime]   = useState(30);
  const [refuelTimePerLap, setRefuelTimePerLap]   = useState(0.8);

  // Drivers
  const [numDrivers, setNumDrivers]               = useState(2);
  const [maxDriverStintMinutes, setMaxDriverStintMinutes] = useState(65);

  // Pit interval slider offset
  const [pitIntervalOffset, setPitIntervalOffset] = useState(0);

  // Strategies
  const [strategies, setStrategies]         = useState<Strategy[]>([]);
  const [activeStrategies, setActiveStrategies] = useState<number[]>([]);
  const [undercutWindows, setUndercutWindows] = useState<{ lap: number; timeSaving: string }[]>([]);
  const [generating, setGenerating]         = useState(false);

  // Derived
  const avgLapTimeSec      = parseTimeString(avgLapTimeStr);
  const raceLaps           = calcTotalLaps(raceDurationHours, avgLapTimeSec);
  const maxDriverStintLaps = Math.ceil((maxDriverStintMinutes * 60) / avgLapTimeSec);
  const baseInterval       = Math.min(fuelTankLaps, tire.maxLife, maxDriverStintLaps);
  const pitIntervalLaps    = Math.max(5, baseInterval + pitIntervalOffset);

  function handleGenerate() {
    if (raceLaps < 5) return;
    setGenerating(true);
    setTimeout(() => {
      try {
        const strategy = generateStrategy({
          raceLaps, tire, fuelTankLaps, fixedServiceTime, refuelTimePerLap,
          numDrivers, maxDriverStintLaps, pitIntervalLaps, fuelEffect,
        });
        const existingIdx = strategies.findIndex(s => s.pitIntervalLaps === strategy.pitIntervalLaps);
        let next: Strategy[];
        if (existingIdx >= 0) {
          next = strategies.map((s, i) => i === existingIdx ? strategy : s);
        } else {
          next = [...strategies, strategy].sort((a, b) => a.numStops - b.numStops);
        }
        setStrategies(next);
        const idx = next.findIndex(s => s.pitIntervalLaps === strategy.pitIntervalLaps);
        if (!activeStrategies.includes(idx)) setActiveStrategies(prev => [...prev, idx]);
        setUndercutWindows(findUndercutWindows(
          strategy.stints, tire, fixedServiceTime, refuelTimePerLap, fuelTankLaps, fuelEffect,
        ));
      } finally {
        setGenerating(false);
      }
    }, 10);
  }

  function toggleStrategy(idx: number) {
    setActiveStrategies(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }

  // Tire edit helpers
  function startTireEdit() {
    const mins = Math.floor(tire.baseline / 60);
    const secs = (tire.baseline % 60).toFixed(3);
    setBaselineStr(`${mins}:${secs.padStart(6, '0')}`);
    setEditingTire(true);
  }
  function saveTireEdit() {
    setTire({ ...tire, baseline: parseTimeString(baselineStr) });
    setEditingTire(false);
  }

  // Chart data
  const lapData: Record<string, any>[]  = [];
  const fuelData: Record<string, any>[] = [];
  for (let lap = 1; lap <= raceLaps; lap++) {
    const le: Record<string, any> = { lap };
    const fe: Record<string, any> = { lap };
    strategies.forEach((strategy, si) => {
      if (!activeStrategies.includes(si)) return;
      for (const stint of strategy.stints) {
        if (lap >= stint.startLap && lap <= stint.endLap) {
          const idx = lap - stint.startLap;
          le[`s${si}`] = stint.lapTimes[idx];
          fe[`s${si}_fuel`] = Math.max(0, stint.fuelAtStart - idx);
          break;
        }
      }
    });
    lapData.push(le);
    fuelData.push(fe);
  }

  const allLapTimes = strategies.flatMap((s, i) =>
    activeStrategies.includes(i) ? s.stints.flatMap(st => st.lapTimes) : []
  ).filter(Boolean) as number[];
  const yMin = allLapTimes.length ? Math.min(...allLapTimes) - 0.3 : 88;
  const yMax = allLapTimes.length ? Math.max(...allLapTimes) + 1 : 95;
  const maxFuel = Math.max(0, ...strategies.flatMap(s => s.stints.map(st => st.fuelAtStart)));
  const stratLabels = strategies.map(s => `${s.numStops}-Stop (${s.pitIntervalLaps}L)`);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-race-text tracking-widest">
          STRATEGY <span className="text-neon-purple">BUILDER</span>
        </h1>
        <p className="text-race-dim text-sm font-mono mt-1">
          Fuel-driven endurance pit strategy planner · {raceLaps > 0 ? `~${raceLaps} laps` : '--'} · {raceDurationHours}h
        </p>
      </div>

      <div className="flex gap-6">

        {/* ── Sidebar ── */}
        <aside className="w-72 flex-shrink-0 space-y-4">

          {/* Race Info */}
          <div className={cardCls}>
            <SectionHeading>Race Info</SectionHeading>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Track Name</span>
                <input type="text" value={trackName} onChange={e => setTrackName(e.target.value)}
                  className={inputCls} placeholder="Track name..." />
              </label>
              <label className="block">
                <span className={labelCls}>Race Duration (hours)</span>
                <input type="number" min="0.5" max="24" step="0.5" value={raceDurationHours}
                  onChange={e => setRaceDurationHours(parseFloat(e.target.value) || 2.5)}
                  className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Avg Lap Time (M:SS.sss)</span>
                <input type="text" value={avgLapTimeStr} onChange={e => setAvgLapTimeStr(e.target.value)}
                  className={inputCls} placeholder="1:30.000" />
              </label>
              {raceLaps > 0 && (
                <div className="text-xs text-race-dim bg-race-dark rounded px-3 py-2 font-mono border border-race-border">
                  Estimated laps:{' '}
                  <span className="text-neon-purple font-bold">{raceLaps}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tire */}
          <div className={cardCls}>
            <SectionHeading>Tire</SectionHeading>
            {editingTire ? (
              <div className="space-y-2">
                <label className="block">
                  <span className={labelCls}>Name</span>
                  <input className={inputCls} value={tire.name}
                    onChange={e => setTire({ ...tire, name: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelCls}>Baseline</span>
                    <input className={inputCls} value={baselineStr}
                      onChange={e => setBaselineStr(e.target.value)} placeholder="1:30.000" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Deg s/lap</span>
                    <input type="number" step="0.01" className={inputCls} value={tire.degradation}
                      onChange={e => setTire({ ...tire, degradation: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label className="block col-span-2">
                    <span className={labelCls}>Max Life (laps)</span>
                    <input type="number" className={inputCls} value={tire.maxLife}
                      onChange={e => setTire({ ...tire, maxLife: parseInt(e.target.value) || 20 })} />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveTireEdit}
                    className="flex-1 text-xs py-2 bg-neon-purple hover:bg-neon-purple-dark text-white rounded font-mono font-medium transition-colors">
                    SAVE
                  </button>
                  <button onClick={() => setEditingTire(false)}
                    className="flex-1 text-xs py-2 bg-race-muted hover:bg-race-border text-race-dim rounded font-mono transition-colors">
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-race-dark border border-race-border rounded-lg p-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DRIVER_COLORS[0] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-mono text-race-text">{tire.name}</span>
                    <span className="text-xs text-neon-purple font-mono">{formatLapTimeSec(tire.baseline)}</span>
                  </div>
                  <div className="text-xs text-race-dim mt-0.5 font-mono">
                    Deg: {tire.degradation}s/lap · Max: {tire.maxLife}L
                  </div>
                </div>
                <button onClick={startTireEdit}
                  className="text-xs px-2 py-1 bg-race-muted hover:bg-race-border text-race-dim rounded font-mono transition-colors">
                  EDIT
                </button>
              </div>
            )}
          </div>

          {/* Fuel */}
          <div className={cardCls}>
            <SectionHeading>Fuel</SectionHeading>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Tank Capacity (laps)</span>
                <input type="number" min="5" max="200" value={fuelTankLaps}
                  onChange={e => setFuelTankLaps(parseInt(e.target.value) || 35)}
                  className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Fuel Effect (s/lap of fuel)</span>
                <input type="number" min="0" max="0.5" step="0.005" value={fuelEffect}
                  onChange={e => setFuelEffect(parseFloat(e.target.value) || 0)}
                  className={inputCls} />
              </label>
            </div>
          </div>

          {/* Pit Service */}
          <div className={cardCls}>
            <SectionHeading>Pit Service</SectionHeading>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Fixed Service Time (s)</span>
                <input type="number" min="10" max="120" step="0.5" value={fixedServiceTime}
                  onChange={e => setFixedServiceTime(parseFloat(e.target.value) || 30)}
                  className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Refuel Rate (s/lap of fuel)</span>
                <input type="number" min="0" max="5" step="0.1" value={refuelTimePerLap}
                  onChange={e => setRefuelTimePerLap(parseFloat(e.target.value) || 0)}
                  className={inputCls} />
              </label>
              <div className="text-xs text-race-dim bg-race-dark rounded px-3 py-2 font-mono border border-race-border">
                Full fill loss:{' '}
                <span className="text-neon-purple font-bold">
                  {(fixedServiceTime + refuelTimePerLap * fuelTankLaps).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Drivers */}
          <div className={cardCls}>
            <SectionHeading>Drivers</SectionHeading>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Number of Drivers</span>
                <input type="number" min="1" max="6" value={numDrivers}
                  onChange={e => setNumDrivers(parseInt(e.target.value) || 1)}
                  className={inputCls} />
              </label>
              {numDrivers > 1 && (
                <label className="block">
                  <span className={labelCls}>Max Driver Stint (minutes)</span>
                  <input type="number" min="10" max="360" step="5" value={maxDriverStintMinutes}
                    onChange={e => setMaxDriverStintMinutes(parseFloat(e.target.value) || 65)}
                    className={inputCls} />
                  <span className="text-xs text-race-dim font-mono mt-1 block">
                    ≈ {maxDriverStintLaps} laps max
                  </span>
                </label>
              )}
            </div>
          </div>

        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Generate panel */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>Generate Strategy</SectionHeading>
              {strategies.length > 0 && (
                <button
                  onClick={() => { setStrategies([]); setActiveStrategies([]); setUndercutWindows([]); }}
                  className="text-xs text-race-dim hover:text-red-400 font-mono transition-colors"
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-race-dim font-mono">
                  Pit every{' '}
                  <span className="text-neon-purple font-bold">{pitIntervalLaps}</span> laps
                </span>
                <span className="text-xs text-race-dim font-mono">
                  → {raceLaps > 0 ? Math.max(0, Math.ceil(raceLaps / pitIntervalLaps) - 1) : '--'} stops
                </span>
              </div>
              <input
                type="range" min={-5} max={5} step={1} value={pitIntervalOffset}
                onChange={e => setPitIntervalOffset(parseInt(e.target.value))}
                className="w-full accent-neon-purple"
              />
              <div className="flex justify-between text-xs text-race-dim font-mono">
                <span>−5L</span>
                <span>fuel: {fuelTankLaps}L · tire: {tire.maxLife}L{numDrivers > 1 ? ` · driver: ${maxDriverStintLaps}L` : ''}</span>
                <span>+5L</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || raceLaps < 5}
              className="w-full py-3 rounded-lg font-mono font-bold text-sm transition-all bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-40 text-white tracking-widest"
              style={{ boxShadow: generating ? 'none' : '0 0 20px rgba(184,79,255,0.3)' }}
            >
              {generating
                ? 'CALCULATING...'
                : `GENERATE ${Math.max(0, Math.ceil(raceLaps / pitIntervalLaps) - 1)}-STOP STRATEGY`}
            </button>
          </div>

          {/* Strategy cards */}
          {strategies.length > 0 && (
            <div className={clsx('grid gap-4', strategies.length >= 3 ? 'grid-cols-3' : strategies.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {strategies.map((strategy, i) => {
                const active = activeStrategies.includes(i);
                const totalLaps = strategy.stints.reduce((a, s) => a + s.numLaps, 0);
                return (
                  <div
                    key={i}
                    onClick={() => toggleStrategy(i)}
                    className={clsx(
                      'bg-race-card border rounded-xl p-4 cursor-pointer transition-all',
                      active
                        ? 'border-neon-purple shadow-lg'
                        : 'border-race-border hover:border-race-muted',
                    )}
                    style={active ? { boxShadow: '0 0 24px rgba(184,79,255,0.15)' } : {}}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-neon-purple">
                          {strategy.numStops}-Stop · every {strategy.pitIntervalLaps}L
                        </span>
                        <div className="text-xl font-mono font-bold text-race-text mt-0.5">
                          {formatTotalTime(strategy.totalTime)}
                        </div>
                      </div>
                      <div className={clsx(
                        'w-3 h-3 rounded-full mt-1 border-2 transition-all',
                        active ? 'bg-neon-purple border-neon-purple' : 'bg-transparent border-race-muted',
                      )} />
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {strategy.stints.map((stint, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: driverColor(stint.driverNumber) }} />
                          <div className="flex-1 bg-race-dark rounded h-1.5 overflow-hidden">
                            <div className="h-full rounded" style={{
                              width: `${(stint.numLaps / totalLaps) * 100}%`,
                              backgroundColor: driverColor(stint.driverNumber),
                            }} />
                          </div>
                          <span className="text-xs text-race-dim font-mono whitespace-nowrap">
                            D{stint.driverNumber} ×{stint.numLaps}L
                          </span>
                          {stint.pitService && (
                            <span className="text-[10px] text-neon-purple font-mono">
                              {pitLabel(stint.pitService)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-3 border-t border-race-border">
                      {[
                        ['Pit stops', strategy.numStops],
                        ['Driver swaps', strategy.numDriverSwaps],
                        ['Avg fuel/stop', `${strategy.avgFuelPerStop.toFixed(1)}L`],
                        ['Stints', strategy.stints.length],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <span className="text-xs text-race-dim font-mono">{label}</span>
                          <div className="text-sm font-mono font-semibold text-race-text">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Undercut windows */}
          {undercutWindows.length > 0 && (
            <div className="bg-race-card border border-neon-purple/30 rounded-xl p-4"
              style={{ boxShadow: '0 0 24px rgba(184,79,255,0.08)' }}>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neon-purple mb-2">
                Undercut Opportunities
              </h3>
              <div className="flex gap-3 flex-wrap">
                {undercutWindows.map((w, i) => (
                  <div key={i} className="bg-neon-purple/10 border border-neon-purple/30 rounded-lg px-3 py-2">
                    <div className="text-sm font-bold text-neon-purple font-mono">LAP {w.lap}</div>
                    <div className="text-xs text-race-dim font-mono">+{w.timeSaving}s gain</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stint canvas */}
          {strategies.filter((_, i) => activeStrategies.includes(i)).length > 0 && (
            <div className={cardCls}>
              <SectionHeading>Stint Visualisation</SectionHeading>
              {strategies.filter((_, i) => activeStrategies.includes(i)).map((strategy, si) => {
                const globalIdx = strategies.indexOf(strategy);
                return (
                  <div key={globalIdx} className="space-y-1 mb-5 last:mb-0">
                    <div className="text-xs text-race-dim font-mono mb-1">
                      {strategy.numStops}-Stop · {strategy.stints.length} stints · {strategy.numDriverSwaps} swap{strategy.numDriverSwaps !== 1 ? 's' : ''}
                    </div>

                    {/* Stint bars */}
                    <div className="relative h-10 flex rounded overflow-hidden border border-race-border">
                      {strategy.stints.map((stint, idx) => {
                        const width = (stint.numLaps / raceLaps) * 100;
                        const color = driverColor(stint.driverNumber);
                        return (
                          <div key={idx} className="relative flex items-center justify-center"
                            style={{
                              width: `${width}%`,
                              backgroundColor: color + '33',
                              borderRight: idx < strategy.stints.length - 1 ? '2px solid #1e1e24' : 'none',
                            }}>
                            {width > 6 && (
                              <span className="text-xs font-bold font-mono select-none"
                                style={{ color }}>
                                D{stint.driverNumber}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Fuel gradient strip */}
                    <div className="relative h-1.5 flex rounded overflow-hidden">
                      {strategy.stints.map((stint, idx) => {
                        const width = (stint.numLaps / raceLaps) * 100;
                        const maxF = strategy.stints[0]?.fuelAtStart || 1;
                        const sf = Math.min(1, stint.fuelAtStart / maxF);
                        const ef = Math.min(1, stint.fuelAtEnd / maxF);
                        return (
                          <div key={idx} style={{
                            width: `${width}%`,
                            background: `linear-gradient(to right,
                              rgb(${Math.round(34 + 221 * (1 - sf))},${Math.round(197 * sf + 34 * (1 - sf))},34),
                              rgb(${Math.round(34 + 221 * (1 - ef))},${Math.round(197 * ef + 34 * (1 - ef))},34))`,
                          }} />
                        );
                      })}
                    </div>

                    {/* Pit lap markers */}
                    <div className="relative h-5">
                      <span className="absolute left-0 text-xs text-race-dim font-mono">L1</span>
                      {strategy.pitWindows.map((lap, i) => {
                        const pct = (lap / raceLaps) * 100;
                        const label = pitLabel(strategy.stints[i]?.pitService ?? null);
                        return (
                          <span key={i} className="absolute text-xs text-neon-purple font-mono transform -translate-x-1/2 whitespace-nowrap"
                            style={{ left: `${pct}%` }}>
                            {lap}
                            {label && <span className="text-race-dim text-[9px] ml-0.5">[{label}]</span>}
                          </span>
                        );
                      })}
                      <span className="absolute right-0 text-xs text-race-dim font-mono">L{raceLaps}</span>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-3 flex-wrap pt-1">
                      {Array.from(new Set(strategy.stints.map(s => s.driverNumber))).map(d => (
                        <div key={d} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: driverColor(d) }} />
                          <span className="text-xs text-race-dim font-mono">Driver {d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lap time chart */}
          {strategies.length > 0 && (
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4">
                <SectionHeading>Lap Time Projection</SectionHeading>
                <div className="flex gap-2 flex-wrap justify-end">
                  {strategies.map((_, i) => (
                    <button key={i} onClick={() => toggleStrategy(i)}
                      className={clsx(
                        'text-xs px-3 py-1 rounded-full border font-mono transition-all',
                        activeStrategies.includes(i)
                          ? 'border-transparent text-white'
                          : 'bg-transparent text-race-dim border-race-border',
                      )}
                      style={activeStrategies.includes(i) ? { backgroundColor: '#b84fff' } : {}}>
                      {stratLabels[i]}
                    </button>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={lapData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
                  <XAxis dataKey="lap" stroke="#6b6b7e" tick={{ fontSize: 11, fill: '#6b6b7e' }} />
                  <YAxis domain={[yMin, yMax]} stroke="#6b6b7e"
                    tick={{ fontSize: 11, fill: '#6b6b7e' }}
                    tickFormatter={v => formatLapTimeSec(v)} width={72} />
                  <Tooltip content={<LapTooltip />} />
                  {strategies.map((_, i) =>
                    activeStrategies.includes(i) ? (
                      <Line key={i} type="monotone" dataKey={`s${i}`}
                        name={stratLabels[i]} stroke={DRIVER_COLORS[i % DRIVER_COLORS.length]}
                        dot={false} strokeWidth={2} connectNulls={false} />
                    ) : null
                  )}
                </LineChart>
              </ResponsiveContainer>

              <p className="text-xs text-race-dim font-mono uppercase tracking-widest mb-2 mt-4">
                Fuel Load
              </p>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={fuelData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
                  <XAxis dataKey="lap" stroke="#6b6b7e" tick={{ fontSize: 10, fill: '#6b6b7e' }} />
                  <YAxis domain={[0, maxFuel + 2]} stroke="#6b6b7e"
                    tick={{ fontSize: 10, fill: '#6b6b7e' }} width={40} />
                  <Tooltip content={<FuelTooltip />} />
                  {strategies.map((_, i) =>
                    activeStrategies.includes(i) ? (
                      <Area key={i} type="stepAfter" dataKey={`s${i}_fuel`}
                        name={stratLabels[i]} stroke={DRIVER_COLORS[i % DRIVER_COLORS.length]}
                        fill={DRIVER_COLORS[i % DRIVER_COLORS.length] + '22'}
                        strokeWidth={1.5} dot={false} connectNulls={false} />
                    ) : null
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty state */}
          {strategies.length === 0 && (
            <div className="bg-race-card border border-dashed border-race-border rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-neon-purple/10 border border-neon-purple/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="font-display font-bold text-xl text-race-text mb-2 tracking-wider">
                NO STRATEGY YET
              </h2>
              <p className="text-sm text-race-dim font-mono mb-6 max-w-sm mx-auto">
                Configure your race details, tire data, and fuel capacity in the sidebar — then hit Generate.
              </p>
              <button onClick={handleGenerate} disabled={raceLaps < 5}
                className="px-6 py-2.5 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-40 text-white rounded-lg text-sm font-mono font-medium transition-colors tracking-widest"
                style={{ boxShadow: '0 0 16px rgba(184,79,255,0.3)' }}>
                GENERATE STRATEGY
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

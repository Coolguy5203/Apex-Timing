"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, ChevronDown } from "lucide-react";
import { formatLapTime } from "@/utils/lapTime";

interface LapHistoryEntry {
  id: string;
  lap_time_ms: number;
  lap_time_formatted: string;
  submitted_at: string;
  validation_status: string;
  car: { id: string; name: string };
  track: { id: string; name: string };
}

interface LapTrendsProps {
  laps: LapHistoryEntry[];
}

function formatAxisTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-race-card border border-race-border rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-neon-purple font-bold text-sm">{d.formatted}</p>
      <p className="text-race-dim mt-0.5">{formatShortDate(d.submitted_at)}</p>
      {d.isPB && <p className="text-neon-green mt-0.5">★ PERSONAL BEST</p>}
      {d.validation_status === "flagged" && (
        <p className="text-yellow-400 mt-0.5">⚠ FLAGGED</p>
      )}
    </div>
  );
};

export function LapTrends({ laps }: LapTrendsProps) {
  // Build unique car+track combos that have ≥2 laps
  const combos = useMemo(() => {
    const map = new Map<string, { label: string; carId: string; trackId: string; count: number }>();
    for (const lap of laps) {
      const key = `${lap.car.id}__${lap.track.id}`;
      if (!map.has(key)) {
        map.set(key, {
          label: `${lap.car.name} · ${lap.track.name}`,
          carId: lap.car.id,
          trackId: lap.track.id,
          count: 0,
        });
      }
      map.get(key)!.count++;
    }
    return Array.from(map.values())
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.count - a.count);
  }, [laps]);

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (combos.length === 0) return "";
    return `${combos[0].carId}__${combos[0].trackId}`;
  });

  const chartData = useMemo(() => {
    if (!selectedKey) return [];
    const [carId, trackId] = selectedKey.split("__");
    const filtered = laps
      .filter((l) => l.car.id === carId && l.track.id === trackId)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    let runningBest = Infinity;
    return filtered.map((lap) => {
      const isPB = lap.lap_time_ms < runningBest;
      if (isPB) runningBest = lap.lap_time_ms;
      return {
        submitted_at: lap.submitted_at,
        lap_time_ms: lap.lap_time_ms,
        formatted: lap.lap_time_formatted,
        validation_status: lap.validation_status,
        isPB,
      };
    });
  }, [laps, selectedKey]);

  const bestMs = useMemo(() => Math.min(...chartData.map((d) => d.lap_time_ms)), [chartData]);
  const worstMs = useMemo(() => Math.max(...chartData.map((d) => d.lap_time_ms)), [chartData]);

  const improvementMs = useMemo(() => {
    if (chartData.length < 2) return null;
    return chartData[0].lap_time_ms - chartData[chartData.length - 1].lap_time_ms;
  }, [chartData]);

  // Y axis domain with a small padding
  const yPadMs = Math.max((worstMs - bestMs) * 0.15, 500);
  const yMin = bestMs - yPadMs;
  const yMax = worstMs + yPadMs;

  if (combos.length === 0) {
    return (
      <div className="race-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown size={16} className="text-neon-purple" />
          <h3 className="font-display font-bold text-race-text tracking-widest text-sm">LAP TIME TRENDS</h3>
        </div>
        <p className="text-race-dim font-mono text-xs mt-6 text-center py-8">
          POST AT LEAST 2 LAPS ON THE SAME CAR &amp; TRACK TO SEE TRENDS
        </p>
      </div>
    );
  }

  return (
    <div className="race-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <TrendingDown size={16} className="text-neon-purple" />
          <h3 className="font-display font-bold text-race-text tracking-widest text-sm">LAP TIME TRENDS</h3>
          {improvementMs !== null && improvementMs > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">
              -{(improvementMs / 1000).toFixed(3)}s IMPROVED
            </span>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="input-field text-xs py-2 pr-8 appearance-none cursor-pointer min-w-[220px]"
          >
            {combos.map((c) => (
              <option key={`${c.carId}__${c.trackId}`} value={`${c.carId}__${c.trackId}`}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="submitted_at"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={formatAxisTime}
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={52}
            reversed
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={bestMs}
            stroke="rgba(74,222,128,0.4)"
            strokeDasharray="4 4"
            label={{ value: "PB", position: "right", fontSize: 9, fill: "rgba(74,222,128,0.7)", fontFamily: "monospace" }}
          />
          <Line
            type="monotone"
            dataKey="lap_time_ms"
            stroke="#b84fff"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.validation_status === "flagged") {
                return <circle key={props.key} cx={cx} cy={cy} r={4} fill="#facc15" stroke="#b84fff" strokeWidth={1} />;
              }
              if (payload.isPB) {
                return <circle key={props.key} cx={cx} cy={cy} r={5} fill="#4ade80" stroke="#b84fff" strokeWidth={1.5} />;
              }
              return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#b84fff" stroke="none" />;
            }}
            activeDot={{ r: 5, fill: "#b84fff" }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs font-mono text-race-dim">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neon-green inline-block" />PB</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neon-purple inline-block" />LAP</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />FLAGGED</span>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Activity } from "lucide-react";

interface LapEntry {
  id: string;
  submitted_at: string;
  car: { id: string; name: string };
  track: { id: string; name: string };
}

interface Props {
  laps: LapEntry[];
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-race-card border border-race-border rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-race-text font-bold">{label}</p>
      <p className="text-neon-purple mt-0.5">{payload[0].value} LAP{payload[0].value !== 1 ? "S" : ""}</p>
    </div>
  );
};

export function LapActivityChart({ laps }: Props) {
  // Laps per week (last 12 weeks)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; count: number; weekStart: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = laps.filter((l) => {
        const d = new Date(l.submitted_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ label, count, weekStart });
    }
    return weeks;
  }, [laps]);

  // Laps per car (top 8)
  const carData = useMemo(() => {
    const map = new Map<string, number>();
    for (const lap of laps) map.set(lap.car.name, (map.get(lap.car.name) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [laps]);

  // Laps per track (top 8)
  const trackData = useMemo(() => {
    const map = new Map<string, number>();
    for (const lap of laps) map.set(lap.track.name, (map.get(lap.track.name) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [laps]);

  const maxWeekly = Math.max(...weeklyData.map((d) => d.count), 1);

  if (laps.length === 0) return null;

  return (
    <div className="race-card p-6 space-y-8">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-neon-purple" />
        <h3 className="font-display font-bold text-race-text tracking-widest text-sm">LAP ACTIVITY</h3>
      </div>

      {/* Weekly activity */}
      <div>
        <p className="text-race-dim text-xs font-mono tracking-widest mb-3">LAPS PER WEEK · LAST 12 WEEKS</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(184,79,255,0.05)" }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {weeklyData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.count === 0 ? "rgba(255,255,255,0.05)" : `rgba(184,79,255,${0.3 + (entry.count / maxWeekly) * 0.7})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* By car */}
        {carData.length > 0 && (
          <div>
            <p className="text-race-dim text-xs font-mono tracking-widest mb-3">LAPS BY CAR</p>
            <div className="space-y-2">
              {carData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-race-dim text-xs font-mono w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-race-text text-xs font-mono truncate">{item.name}</span>
                      <span className="text-race-dim text-xs font-mono flex-shrink-0">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-race-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.count / carData[0].count) * 100}%`,
                          background: i === 0 ? "#b84fff" : "rgba(184,79,255,0.4)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By track */}
        {trackData.length > 0 && (
          <div>
            <p className="text-race-dim text-xs font-mono tracking-widest mb-3">LAPS BY CIRCUIT</p>
            <div className="space-y-2">
              {trackData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-race-dim text-xs font-mono w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-race-text text-xs font-mono truncate">{item.name}</span>
                      <span className="text-race-dim text-xs font-mono flex-shrink-0">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-race-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.count / trackData[0].count) * 100}%`,
                          background: i === 0 ? "#4ade80" : "rgba(74,222,128,0.4)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

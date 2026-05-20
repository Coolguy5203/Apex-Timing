import { Medal } from "lucide-react";
import clsx from "clsx";

interface TopDriver {
  driver_name: string;
  team_name?: string;
  lap_count: number;
}

interface TopDriversProps {
  drivers: TopDriver[];
}

const rankColors = ["text-neon-purple", "text-lap-silver", "text-lap-bronze"];
const rankBg = [
  "bg-neon-purple/10 border-neon-purple/30",
  "bg-white/5 border-white/10",
  "bg-amber-900/10 border-amber-700/20",
];

export function TopDrivers({ drivers }: TopDriversProps) {
  if (drivers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-race-dim font-mono text-sm">NO DRIVERS YET</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drivers.slice(0, 5).map((driver, index) => (
        <div
          key={driver.driver_name}
          className={clsx(
            "flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.01]",
            index < 3 ? rankBg[index] : "bg-race-card border-race-border"
          )}
        >
          <div className={clsx("w-8 h-8 rounded flex items-center justify-center font-display font-black text-lg flex-shrink-0", index < 3 ? rankColors[index] : "text-race-dim")}>
            {index === 0 ? <Medal size={20} className="text-neon-purple" /> : index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-race-text tracking-wide text-sm truncate">
              {driver.driver_name.toUpperCase()}
            </p>
            {driver.team_name && (
              <p className="text-race-dim text-xs font-mono truncate">{driver.team_name}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <span className={clsx("font-mono font-bold text-lg", index === 0 ? "text-neon-purple" : "text-race-text")}>
              {driver.lap_count}
            </span>
            <p className="text-race-dim text-xs font-mono">LAPS</p>
          </div>
        </div>
      ))}
    </div>
  );
}

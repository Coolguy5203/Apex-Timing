import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "purple" | "green";
  subtext?: string;
}

export function StatCard({ label, value, icon: Icon, accent = "purple", subtext }: StatCardProps) {
  return (
    <div className="race-card p-5 group hover:border-neon-purple/40 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-2">{label}</p>
          <p className={clsx("font-display font-bold text-4xl tracking-tight", accent === "purple" ? "text-gradient-purple" : "text-neon-green")}>
            {value}
          </p>
          {subtext && <p className="text-race-dim text-xs font-mono mt-1">{subtext}</p>}
        </div>
        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", accent === "purple" ? "bg-neon-purple-glow border border-neon-purple/20" : "bg-neon-green-glow border border-neon-green/20")}>
          <Icon size={18} className={accent === "purple" ? "text-neon-purple" : "text-neon-green"} />
        </div>
      </div>
    </div>
  );
}

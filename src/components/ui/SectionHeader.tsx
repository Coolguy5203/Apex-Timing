import { type LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, icon: Icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 bg-neon-purple-glow border border-neon-purple/20 rounded flex items-center justify-center">
            <Icon size={16} className="text-neon-purple" />
          </div>
        )}
        <div>
          <h2 className="font-display font-bold text-xl text-race-text tracking-wider">{title}</h2>
          {subtitle && <p className="text-race-dim text-xs font-mono mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

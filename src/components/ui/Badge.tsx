import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "green" | "muted" | "gold";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "muted", size = "sm" }: BadgeProps) {
  return (
    <span className={clsx(
      "inline-flex items-center font-mono font-medium rounded tracking-wider",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      {
        "bg-neon-purple/10 text-neon-purple border border-neon-purple/20": variant === "purple",
        "bg-neon-green/10 text-neon-green border border-neon-green/20": variant === "green",
        "bg-race-muted text-race-dim border border-race-border": variant === "muted",
        "bg-lap-gold/10 text-lap-gold border border-lap-gold/20": variant === "gold",
      }
    )}>
      {children}
    </span>
  );
}

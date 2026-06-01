import Link from "next/link";
import { Flag, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid-bg min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Big number */}
        <div className="relative mb-6">
          <span className="font-display font-black text-[120px] leading-none text-neon-purple/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Flag size={48} className="text-neon-purple" />
          </div>
        </div>

        <h1 className="font-display font-black text-3xl text-race-text tracking-wider mb-2">
          TRACK NOT FOUND
        </h1>
        <p className="text-race-dim font-mono text-sm tracking-wide mb-8">
          This page went off-track. Head back to the pits.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-neon-purple hover:bg-neon-purple-dark text-white font-mono font-bold text-xs tracking-widest rounded-lg transition-all"
          >
            <ChevronLeft size={14} />
            HOME
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-6 py-3 bg-race-card hover:bg-race-muted border border-race-border hover:border-neon-purple/30 text-race-dim hover:text-race-text font-mono font-bold text-xs tracking-widest rounded-lg transition-all"
          >
            LEADERBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Check, AlertCircle, Crown } from "lucide-react";
import clsx from "clsx";

interface AdminToolsProps {
  currentTeamRank: number;
}

export function AdminTools({ currentTeamRank }: AdminToolsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAlreadyRD = currentTeamRank === 2;

  const handlePromote = async () => {
    if (isAlreadyRD) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/set-rank", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed" });
      } else {
        setMessage({ type: "success", text: "You are now Race Director 🏁" });
        setTimeout(() => router.refresh(), 1000);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="race-card p-6 border-red-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={14} className="text-red-400" />
        <h2 className="font-display font-bold text-race-text tracking-widest text-sm">ADMIN TOOLS</h2>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">OWNER ONLY</span>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-race-dark rounded-lg border border-race-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏁</span>
          <div>
            <p className="font-mono font-bold text-race-text text-sm">RACE DIRECTOR</p>
            <p className="text-race-dim text-xs font-mono mt-0.5">
              {isAlreadyRD
                ? "You are already Race Director — you can promote and demote team members."
                : "Set yourself as team Race Director. Grants full control over team member ranks."}
            </p>
          </div>
        </div>
        <button
          onClick={handlePromote}
          disabled={loading || isAlreadyRD}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold tracking-widest transition-all flex-shrink-0",
            isAlreadyRD
              ? "bg-neon-green/10 border border-neon-green/30 text-neon-green cursor-default"
              : "bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 disabled:opacity-50"
          )}
        >
          {loading ? (
            <span className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          ) : isAlreadyRD ? (
            <Check size={12} />
          ) : (
            <Crown size={12} />
          )}
          {isAlreadyRD ? "ACTIVE" : loading ? "SETTING..." : "SET AS RD"}
        </button>
      </div>

      {message && (
        <div className={clsx(
          "flex items-center gap-2 mt-3 p-3 rounded text-xs font-mono",
          message.type === "success"
            ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        )}>
          {message.type === "success" ? <Check size={12} /> : <AlertCircle size={12} />}
          {message.text}
        </div>
      )}
    </div>
  );
}

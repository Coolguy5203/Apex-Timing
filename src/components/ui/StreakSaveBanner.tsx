"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StreakSaveBannerProps {
  streakBeforeBreak: number;
  shields: number;
}

export function StreakSaveBanner({ streakBeforeBreak, shields }: StreakSaveBannerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/streak/save", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSaved(true);
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div
        className="rounded-xl p-5 mb-6 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(74,222,128,0.05) 100%)", border: "1px solid rgba(74,222,128,0.3)" }}
      >
        <CheckCircle2 size={28} className="text-neon-green flex-shrink-0" />
        <div>
          <p className="font-display font-bold text-neon-green tracking-widest">STREAK SAVED!</p>
          <p className="text-race-dim text-xs font-mono mt-0.5">Your {streakBeforeBreak}-day streak has been restored. Keep it going!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 mb-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.1) 50%, rgba(0,0,0,0) 100%)",
        border: "1px solid rgba(249,115,22,0.5)",
        boxShadow: "0 0 30px rgba(249,115,22,0.12)",
      }}
    >
      {/* Pulse ring */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 animate-pulse"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.8) 0%, transparent 70%)" }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
        {/* Icon + flames */}
        <div className="flex-shrink-0">
          <div className="text-4xl animate-pulse">🔥</div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-orange-400" />
            <p className="font-display font-bold text-orange-400 tracking-widest text-sm">
              STREAK IN DANGER
            </p>
          </div>
          <p className="text-race-text font-mono text-sm mb-1">
            You missed yesterday. Your{" "}
            <span className="text-orange-400 font-bold">{streakBeforeBreak}-day streak</span>{" "}
            is on the line.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-race-dim text-xs font-mono">SHIELDS AVAILABLE:</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shield
                  key={i}
                  size={14}
                  className={i < shields ? "text-orange-400" : "text-race-dim/30"}
                  fill={i < shields ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-orange-400 font-mono font-bold text-xs">{shields}/3</span>
          </div>
          {error && <p className="text-red-400 text-xs font-mono mt-1">{error}</p>}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-lg font-display font-bold text-sm tracking-widest text-white disabled:opacity-50 transition-all"
          style={{
            background: saving ? "rgba(249,115,22,0.4)" : "linear-gradient(135deg, #f97316, #ef4444)",
            boxShadow: saving ? "none" : "0 0 20px rgba(249,115,22,0.4)",
          }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />SAVING...</>
          ) : (
            <><Shield size={15} fill="currentColor" />USE SHIELD</>
          )}
        </button>
      </div>
    </div>
  );
}

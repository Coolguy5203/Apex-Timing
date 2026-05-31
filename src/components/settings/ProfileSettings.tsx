"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle, User, Mail, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface ProfileSettingsProps {
  userId: string;
  currentDriverName: string;
  email: string;
  isPro: boolean;
  teamName: string | null;
}

export function ProfileSettings({ userId, currentDriverName, email, isPro, teamName }: ProfileSettingsProps) {
  const router = useRouter();
  const [driverName, setDriverName] = useState(currentDriverName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const hasChanges = driverName.trim() !== currentDriverName;

  const handleSave = async () => {
    if (!hasChanges) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_name: driverName }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg("error", data.error);
      } else {
        showMsg("success", "Profile updated successfully!");
        router.refresh();
      }
    } catch {
      showMsg("error", "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Account info card */}
      <div className="race-card p-6">
        <h2 className="section-label mb-5">ACCOUNT INFO</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-race-dark rounded-lg border border-race-border">
            <Mail size={16} className="text-race-dim flex-shrink-0" />
            <div>
              <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5">EMAIL</p>
              <p className="text-race-text font-mono text-sm">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-race-dark rounded-lg border border-race-border">
            <Zap size={16} className={isPro ? "text-neon-purple" : "text-race-dim"} />
            <div>
              <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5">ACCOUNT TYPE</p>
              <div className="flex items-center gap-2">
                {isPro ? (
                  <Badge variant="purple" size="sm">⚡ PRO</Badge>
                ) : (
                  <span className="text-race-text font-mono text-sm">FREE</span>
                )}
              </div>
            </div>
          </div>
          {teamName && (
            <div className="flex items-center gap-3 p-4 bg-race-dark rounded-lg border border-race-border">
              <Shield size={16} className="text-race-dim flex-shrink-0" />
              <div>
                <p className="text-race-dim text-xs font-mono tracking-widest mb-0.5">TEAM</p>
                <p className="text-race-text font-mono text-sm">{teamName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit driver name */}
      <div className="race-card p-6">
        <h2 className="section-label mb-5">DRIVER PROFILE</h2>

        {message && (
          <div className={clsx(
            "flex items-center gap-2 p-3 rounded-lg mb-5 text-xs font-mono",
            message.type === "success"
              ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            {message.type === "error" ? <AlertCircle size={12} /> : <Check size={12} />}
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="section-label block mb-2">DRIVER NAME</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Your driver name"
                maxLength={32}
                className="input-field pl-9"
              />
            </div>
            <p className="text-race-dim/60 text-xs font-mono mt-1.5">
              This is how your name appears on the leaderboard and driver profile.
              Changing it will update everywhere immediately.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || loading || driverName.trim().length < 2}
            className="w-full flex items-center justify-center gap-2 py-3 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
            style={{ boxShadow: hasChanges && !loading ? "0 0 20px rgba(184,79,255,0.3)" : "none" }}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />SAVING...</>
            ) : (
              <><Check size={14} />SAVE CHANGES</>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}

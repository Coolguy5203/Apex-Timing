"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Check, AlertCircle, ChevronRight, Star, Shield, BarChart2, Car, MapPin, Users, Trophy } from "lucide-react";
import clsx from "clsx";

const PRO_FEATURES = [
  { icon: Car, title: "All iRacing Cars", description: "Access every car in the iRacing roster — GT3, GT4, LMP, GTP, Formula, NASCAR, Oval and more", free: "40 cars", pro: "200+ cars" },
  { icon: MapPin, title: "All iRacing Tracks", description: "Every circuit, oval, and street course available in iRacing", free: "70 tracks", pro: "150+ tracks" },
  { icon: BarChart2, title: "Basic Telemetry", description: "View sector times, speed traces, and lap delta charts for your sessions", free: false, pro: true },
  { icon: Trophy, title: "PRO Leaderboard", description: "Separate PRO-only leaderboard with verified lap times", free: false, pro: true },
  { icon: Star, title: "PRO Badge", description: "Stand out on the leaderboard and team page with a gold PRO badge", free: false, pro: true },
  { icon: Users, title: "Extended Team Stats", description: "Full team analytics, driver comparisons, and performance trends", free: "Basic", pro: "Full" },
  { icon: Shield, title: "Priority Support", description: "Direct access to the APEX TIMING team for help and feature requests", free: false, pro: true },
];

export function ProUpgrade() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) { setError("Enter a code first"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/redeem-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-20 h-20 rounded-full bg-lap-gold/10 border-2 border-lap-gold/40 flex items-center justify-center mb-6">
          <Zap size={36} className="text-lap-gold" />
        </div>
        <h2 className="font-display font-black text-4xl text-race-text tracking-wider mb-2">
          WELCOME TO PRO!
        </h2>
        <p className="text-race-dim font-mono text-sm">Unlocking your features...</p>
        <div className="mt-4 w-8 h-8 border-2 border-lap-gold/30 border-t-lap-gold rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-lap-gold/10 border border-lap-gold/30 rounded-full mb-6">
          <Zap size={14} className="text-lap-gold" />
          <span className="text-lap-gold text-xs font-mono font-bold tracking-widest">APEX TIMING PRO</span>
        </div>
        <h1 className="font-display font-black text-5xl md:text-6xl text-race-text tracking-wider mb-4">
          TAKE IT TO THE<br />
          <span style={{ color: "#ffd700", textShadow: "0 0 30px rgba(255,215,0,0.4)" }}>NEXT LEVEL</span>
        </h1>
        <p className="text-race-dim font-body text-lg max-w-xl mx-auto">
          Unlock every car, every track, and advanced telemetry tools to gain the competitive edge over your rivals.
        </p>
      </div>

      {/* Code redemption box */}
      <div className="max-w-md mx-auto mb-16">
        <div className="race-card p-6" style={{ borderColor: "rgba(255,215,0,0.2)", boxShadow: "0 0 40px rgba(255,215,0,0.05)" }}>
          <p className="section-label mb-3 text-center">HAVE A PRO CODE?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              placeholder="ENTER-CODE-HERE"
              className="input-field flex-1 tracking-widest text-center uppercase"
              style={{ borderColor: error ? "rgba(239,68,68,0.5)" : code ? "rgba(255,215,0,0.4)" : undefined }}
            />
            <button
              onClick={handleRedeem}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-md font-display font-bold tracking-widest text-sm transition-all duration-200 disabled:opacity-50 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                color: "#0a0a0b",
                boxShadow: code ? "0 0 20px rgba(255,215,0,0.3)" : "none",
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>UNLOCK <ChevronRight size={14} /></>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-red-400 text-xs font-mono flex items-center gap-1 justify-center">
              <AlertCircle size={11} />{error}
            </p>
          )}
          <p className="text-race-dim/50 text-xs font-mono text-center mt-3">
            Codes are shared by APEX TIMING admins
          </p>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="race-card overflow-hidden mb-8">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] border-b border-race-border bg-race-dark">
          <div className="px-6 py-4 text-xs font-mono text-race-dim tracking-widest">FEATURE</div>
          <div className="px-6 py-4 text-xs font-mono text-race-dim tracking-widest text-center w-28">FREE</div>
          <div className="px-6 py-4 text-xs font-mono tracking-widest text-center w-28" style={{ color: "#ffd700" }}>
            PRO ⚡
          </div>
        </div>

        {PRO_FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className={clsx(
              "grid grid-cols-[1fr_auto_auto] border-b border-race-border/50 last:border-0 items-center",
              index % 2 === 0 ? "bg-race-dark/50" : ""
            )}
          >
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <feature.icon size={16} className="text-race-dim flex-shrink-0" />
                <div>
                  <p className="text-race-text text-sm font-mono font-bold">{feature.title}</p>
                  <p className="text-race-dim text-xs mt-0.5 hidden md:block">{feature.description}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 text-center w-28">
              {feature.free === false ? (
                <span className="text-race-dim/40 text-lg">✕</span>
              ) : feature.free === true ? (
                <Check size={16} className="text-neon-green mx-auto" />
              ) : (
                <span className="text-race-dim text-xs font-mono">{feature.free}</span>
              )}
            </div>
            <div className="px-6 py-4 text-center w-28">
              {feature.pro === true ? (
                <Check size={16} className="mx-auto" style={{ color: "#ffd700" }} />
              ) : (
                <span className="text-xs font-mono font-bold" style={{ color: "#ffd700" }}>{feature.pro}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-race-dim/40 text-xs font-mono text-center">
        APEX TIMING PRO · CONTACT AN ADMIN FOR ACCESS CODES
      </p>
    </div>
  );
}

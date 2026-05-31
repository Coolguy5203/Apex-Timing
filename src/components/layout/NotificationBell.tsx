"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Trophy, Zap, Flame, Target, X, CheckCheck } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/utils/lapTime";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  ACHIEVEMENT_UNLOCKED: { icon: <Trophy size={14} />, color: "text-yellow-400" },
  LAP_BEATEN:           { icon: <Zap size={14} />,    color: "text-neon-purple" },
  STREAK_MILESTONE:     { icon: <Flame size={14} />,  color: "text-orange-400" },
  CHALLENGE_ACTIVE:     { icon: <Target size={14} />, color: "text-neon-green" },
  RANK_PROMOTION:       { icon: <Trophy size={14} />, color: "text-yellow-400" },
  RANK_CHANGE:          { icon: <Trophy size={14} />, color: "text-race-dim" },
  H2H_MATCHED:          { icon: <Zap size={14} />,    color: "text-neon-purple" },
  H2H_WIN:              { icon: <Trophy size={14} />, color: "text-neon-green" },
  H2H_LOSS:             { icon: <Zap size={14} />,    color: "text-race-dim" },
};

export function NotificationBell() {
  const [count, setCount]   = useState(0);
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) { const d = await res.json(); setCount(d.count ?? 0); }
    } catch {}
  };

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/feed");
      if (res.ok) { const d = await res.json(); setNotifs(d.notifications ?? []); }
    } catch {}
    setLoading(false);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/feed", { method: "POST" });
    setCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, []);

  useEffect(() => {
    if (open) { fetchFeed(); if (count > 0) markAllRead(); }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 text-race-dim hover:text-race-text border border-race-border hover:border-race-border/60 rounded transition-colors"
      >
        <Bell size={14} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-purple text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 rounded-xl border border-race-border shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0f0f18", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(184,79,255,0.1)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-race-border">
            <span className="font-display font-bold text-race-text text-xs tracking-widest">NOTIFICATIONS</span>
            <div className="flex items-center gap-2">
              {notifs.some((n) => !n.read) && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-race-dim hover:text-race-text text-[10px] font-mono transition-colors">
                  <CheckCheck size={11} />MARK ALL READ
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-race-dim hover:text-race-text transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-race-border border-t-neon-purple rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-race-dim/30 mx-auto mb-2" />
                <p className="text-race-dim text-xs font-mono">NO NOTIFICATIONS YET</p>
              </div>
            ) : (
              notifs.map((n) => {
                const meta = TYPE_META[n.type] ?? { icon: <Bell size={14} />, color: "text-race-dim" };
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-race-border/40 last:border-0 transition-colors ${!n.read ? "bg-neon-purple/5" : ""}`}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${meta.color}`}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-mono font-bold truncate ${!n.read ? "text-race-text" : "text-race-dim"}`}>{n.title}</p>
                      <p className="text-race-dim/70 text-[11px] font-mono mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-race-dim/40 text-[10px] font-mono mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-neon-purple flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Users, Timer, Key, Trash2, Crown, Zap, Plus, X, Check, AlertCircle, AlertTriangle, CheckCheck, Trophy, Calendar, Target, Swords } from "lucide-react";
import { formatRelativeTime } from "@/utils/lapTime";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface AdminDashboardProps {
  currentUser: any;
  users: any[];
  lapTimes: any[];
  proCodes: any[];
  seasons: any[];
  challenges: any[];
  h2hEvents: any[];
  cars: any[];
  tracks: any[];
}

type Tab = "users" | "laps" | "codes" | "seasons" | "challenges" | "h2h";

export function AdminDashboard({ currentUser, users, lapTimes, proCodes, seasons, challenges, h2hEvents, cars, tracks }: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newCode, setNewCode] = useState({ code: "", description: "", max_uses: "" });
  const [showNewCode, setShowNewCode] = useState(false);
  const [newSeason, setNewSeason] = useState({ name: "", start_date: "", end_date: "" });
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [newChallenge, setNewChallenge] = useState({ name: "", description: "", car_id: "", track_id: "", car_class: "", start_date: "", end_date: "", bonus_points: "5" });
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [newH2H, setNewH2H] = useState({ name: "", start_date: "", end_date: "", points_win: "3", default_car_id: "", default_track_id: "" });
  const [showNewH2H, setShowNewH2H] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleAdmin = async (userId: string, currentValue: boolean) => {
    if (userId === currentUser.id) return;
    setLoading(userId);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ is_admin: !currentValue }).eq("id", userId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Admin status updated"); router.refresh(); }
    setLoading(null);
  };

  const togglePro = async (userId: string, currentValue: boolean) => {
    setLoading(`pro-${userId}`);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ is_pro: !currentValue, pro_since: !currentValue ? new Date().toISOString() : null }).eq("id", userId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "PRO status updated"); router.refresh(); }
    setLoading(null);
  };

  const approveLap = async (lapId: string) => {
    setLoading(`approve-${lapId}`);
    const supabase = createClient();
    const { error } = await supabase.from("lap_times").update({ validation_status: "valid", flag_reason: null }).eq("id", lapId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Lap approved"); router.refresh(); }
    setLoading(null);
  };

  const deleteLap = async (lapId: string) => {
    if (!confirm("Delete this lap time? This cannot be undone.")) return;
    setLoading(lapId);
    const supabase = createClient();
    const { error } = await supabase.from("lap_times").delete().eq("id", lapId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Lap time deleted"); router.refresh(); }
    setLoading(null);
  };

  const toggleCode = async (codeId: string, currentValue: boolean) => {
    setLoading(`code-${codeId}`);
    const supabase = createClient();
    const { error } = await supabase.from("pro_codes").update({ active: !currentValue }).eq("id", codeId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", `Code ${currentValue ? "deactivated" : "activated"}`); router.refresh(); }
    setLoading(null);
  };

  const createCode = async () => {
    if (!newCode.code.trim()) return;
    setLoading("new-code");
    const supabase = createClient();
    const { error } = await supabase.from("pro_codes").insert({ code: newCode.code.toUpperCase().trim(), description: newCode.description || null, max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null, active: true });
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Code created!"); setNewCode({ code: "", description: "", max_uses: "" }); setShowNewCode(false); router.refresh(); }
    setLoading(null);
  };

  const deleteCode = async (codeId: string) => {
    if (!confirm("Delete this code?")) return;
    setLoading(`del-code-${codeId}`);
    const supabase = createClient();
    const { error } = await supabase.from("pro_codes").delete().eq("id", codeId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Code deleted"); router.refresh(); }
    setLoading(null);
  };

  const createSeason = async () => {
    if (!newSeason.name || !newSeason.start_date || !newSeason.end_date) return;
    setLoading("new-season");
    const supabase = createClient();
    const { error } = await supabase.from("seasons").insert({ name: newSeason.name.trim(), start_date: newSeason.start_date, end_date: newSeason.end_date, is_active: false, created_by: currentUser.id });
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Season created!"); setNewSeason({ name: "", start_date: "", end_date: "" }); setShowNewSeason(false); router.refresh(); }
    setLoading(null);
  };

  const toggleSeason = async (seasonId: string, currentlyActive: boolean) => {
    setLoading(`season-${seasonId}`);
    const supabase = createClient();
    if (!currentlyActive) await supabase.from("seasons").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("seasons").update({ is_active: !currentlyActive }).eq("id", seasonId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", currentlyActive ? "Season deactivated" : "Season set as active"); router.refresh(); }
    setLoading(null);
  };

  const deleteSeason = async (seasonId: string) => {
    if (!confirm("Delete this season?")) return;
    setLoading(`del-season-${seasonId}`);
    const supabase = createClient();
    const { error } = await supabase.from("seasons").delete().eq("id", seasonId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Season deleted"); router.refresh(); }
    setLoading(null);
  };

  const createChallenge = async () => {
    if (!newChallenge.name || !newChallenge.start_date || !newChallenge.end_date) return;
    if (!newChallenge.car_id && !newChallenge.car_class) { showMessage("error", "Choose a car or class"); return; }
    if (!newChallenge.track_id) { showMessage("error", "Choose a track"); return; }
    setLoading("new-challenge");
    const supabase = createClient();
    const { error } = await supabase.from("challenges").insert({ name: newChallenge.name.trim(), description: newChallenge.description || null, car_id: newChallenge.car_id || null, track_id: newChallenge.track_id || null, car_class: newChallenge.car_class || null, start_date: newChallenge.start_date, end_date: newChallenge.end_date, bonus_points: parseInt(newChallenge.bonus_points) || 5, created_by: currentUser.id });
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Challenge created!"); setNewChallenge({ name: "", description: "", car_id: "", track_id: "", car_class: "", start_date: "", end_date: "", bonus_points: "5" }); setShowNewChallenge(false); router.refresh(); }
    setLoading(null);
  };

  const finalizeChallenge = async (id: string) => {
    if (!confirm("Award bonus points to the driver with the best lap in this challenge window?")) return;
    setLoading(`fin-ch-${id}`);
    const res = await fetch("/api/challenges/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge_id: id }) });
    const data = await res.json();
    if (!res.ok) showMessage("error", data.error || "Failed");
    else showMessage("success", `✅ ${data.winner_name} awarded +${data.points_awarded} pts`);
    setLoading(null);
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge?")) return;
    setLoading(`del-ch-${id}`);
    const supabase = createClient();
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "Challenge deleted"); router.refresh(); }
    setLoading(null);
  };

  const createH2HEvent = async () => {
    if (!newH2H.name || !newH2H.start_date || !newH2H.end_date) return;
    setLoading("new-h2h");
    const supabase = createClient();
    const { error } = await supabase.from("h2h_events").insert({ name: newH2H.name, start_date: newH2H.start_date, end_date: newH2H.end_date, points_win: parseInt(newH2H.points_win) || 3, default_car_id: newH2H.default_car_id || null, default_track_id: newH2H.default_track_id || null, status: "pending" });
    if (error) showMessage("error", error.message);
    else { showMessage("success", "H2H event created"); setShowNewH2H(false); setNewH2H({ name: "", start_date: "", end_date: "", points_win: "3", default_car_id: "", default_track_id: "" }); router.refresh(); }
    setLoading(null);
  };

  const generateH2H = async (eventId: string) => {
    if (!confirm("Generate matchups now? This will pair all drivers by skill level.")) return;
    setLoading(`gen-${eventId}`);
    const res = await fetch("/api/h2h/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: eventId }) });
    const data = await res.json();
    if (!res.ok) showMessage("error", data.error);
    else { showMessage("success", `${data.matchups_created} matchups created`); router.refresh(); }
    setLoading(null);
  };

  const finalizeH2H = async (eventId: string) => {
    if (!confirm("Finalize this event? Winners will be determined and points awarded.")) return;
    setLoading(`fin-${eventId}`);
    const res = await fetch("/api/h2h/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: eventId }) });
    const data = await res.json();
    if (!res.ok) showMessage("error", data.error);
    else { showMessage("success", `${data.finalized} matchups finalized`); router.refresh(); }
    setLoading(null);
  };

  const deleteH2H = async (id: string) => {
    if (!confirm("Delete this H2H event and all its matchups?")) return;
    setLoading(`del-h2h-${id}`);
    const supabase = createClient();
    const { error } = await supabase.from("h2h_events").delete().eq("id", id);
    if (error) showMessage("error", error.message);
    else { showMessage("success", "H2H event deleted"); router.refresh(); }
    setLoading(null);
  };

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "users",      label: "DRIVERS",    icon: Users,   count: users.length      },
    { id: "laps",       label: "LAPS",       icon: Timer,   count: lapTimes.length   },
    { id: "codes",      label: "CODES",      icon: Key,     count: proCodes.length   },
    { id: "seasons",    label: "SEASONS",    icon: Trophy,  count: seasons.length    },
    { id: "challenges", label: "CHALLENGES", icon: Target,  count: challenges.length },
    { id: "h2h",        label: "H2H",        icon: Swords,  count: h2hEvents.length  },
  ];

  const flaggedCount = lapTimes.filter((l: any) => l.validation_status === "flagged").length;

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-red-400" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl sm:text-4xl text-race-text tracking-wider">ADMIN</h1>
              <p className="text-race-dim font-mono text-[10px] sm:text-xs tracking-widest">APEX TIMING CONTROL PANEL</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Shield size={11} className="text-red-400" />
            <span className="text-red-400 text-[10px] sm:text-xs font-mono font-bold truncate max-w-[80px] sm:max-w-none">{currentUser.driver_name.toUpperCase()}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "DRIVERS", value: users.length, color: "text-neon-purple" },
            { label: "LAPS", value: lapTimes.length, color: "text-neon-green" },
            { label: "PRO MEMBERS", value: users.filter(u => u.is_pro).length, color: "text-lap-gold" },
            { label: "FLAGGED", value: flaggedCount, color: flaggedCount > 0 ? "text-yellow-400" : "text-race-dim" },
          ].map((stat) => (
            <div key={stat.label} className="race-card p-4">
              <p className="section-label mb-1 text-[10px]">{stat.label}</p>
              <p className={`font-display font-black text-3xl ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Message toast */}
        {message && (
          <div className={clsx(
            "flex items-center gap-2 p-3 rounded-lg mb-4 text-xs sm:text-sm font-mono",
            message.type === "success"
              ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            {message.type === "success" ? <Check size={13} /> : <AlertCircle size={13} />}
            {message.text}
          </div>
        )}

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="overflow-x-auto mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-race-card border border-race-border rounded-lg p-1 min-w-max sm:min-w-0">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-medium tracking-widest transition-all whitespace-nowrap",
                  tab === id ? "bg-neon-purple text-white" : "text-race-dim hover:text-race-text"
                )}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.slice(0, 4)}</span>
                <span className={clsx("px-1.5 py-0.5 rounded text-[10px]", tab === id ? "bg-white/20" : "bg-race-muted")}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="race-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-race-text text-sm">{user.driver_name}</span>
                      {user.id === currentUser.id && <Badge variant="purple" size="sm">YOU</Badge>}
                      {user.is_admin && <Badge variant="muted" size="sm">ADMIN</Badge>}
                    </div>
                    <p className="text-race-dim text-xs font-mono truncate">{user.email}</p>
                    {user.team_name && <p className="text-race-dim text-xs font-mono">{user.team_name}</p>}
                    <p className="text-race-dim/50 text-[10px] font-mono mt-1">{formatRelativeTime(user.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePro(user.id, user.is_pro)}
                      disabled={loading === `pro-${user.id}`}
                      className={clsx(
                        "px-2.5 py-1 rounded text-xs font-mono font-bold transition-all",
                        user.is_pro
                          ? "bg-lap-gold/10 text-lap-gold border border-lap-gold/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                          : "bg-race-muted text-race-dim border border-race-border hover:bg-lap-gold/10 hover:text-lap-gold hover:border-lap-gold/20"
                      )}
                    >
                      {loading === `pro-${user.id}` ? "..." : user.is_pro ? "⚡ PRO" : "FREE"}
                    </button>
                    <button
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      disabled={loading === user.id || user.id === currentUser.id}
                      className={clsx(
                        "px-2.5 py-1 rounded text-xs font-mono font-bold transition-all disabled:opacity-40",
                        user.is_admin
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-race-muted text-race-dim border border-race-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                      )}
                    >
                      {loading === user.id ? "..." : user.is_admin ? "ADMIN" : "USER"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LAPS TAB ── */}
        {tab === "laps" && (
          <div className="space-y-2">
            {lapTimes.map((lap) => {
              const isFlagged = lap.validation_status === "flagged";
              return (
                <div key={lap.id} className={clsx("race-card p-4", isFlagged && "border-yellow-500/30 bg-yellow-500/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-race-text text-sm">
                          {(lap.users as any)?.driver_name?.toUpperCase()}
                        </span>
                        <span className="lap-time-display text-sm">{lap.lap_time_formatted}</span>
                      </div>
                      <p className="text-race-dim text-xs font-mono">{(lap.cars as any)?.name} · {(lap.tracks as any)?.name}</p>
                      <p className="text-race-dim/50 text-[10px] font-mono mt-0.5">{formatRelativeTime(lap.submitted_at)}</p>
                      {isFlagged && lap.flag_reason && (
                        <p className="text-yellow-400 text-[10px] font-mono mt-1 flex items-center gap-1">
                          <AlertTriangle size={9} />{lap.flag_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isFlagged ? (
                        <button
                          onClick={() => approveLap(lap.id)}
                          disabled={loading === `approve-${lap.id}`}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-neon-green/10 hover:text-neon-green hover:border-neon-green/20 transition-all"
                        >
                          {loading === `approve-${lap.id}` ? "..." : <><AlertTriangle size={10} />APPROVE</>}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-mono text-neon-green/60">
                          <CheckCheck size={10} />OK
                        </span>
                      )}
                      <button
                        onClick={() => deleteLap(lap.id)}
                        disabled={loading === lap.id}
                        className="p-1.5 text-race-dim hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {loading === lap.id ? "..." : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CODES TAB ── */}
        {tab === "codes" && (
          <div>
            <div className="mb-4">
              {!showNewCode ? (
                <button onClick={() => setShowNewCode(true)} className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all" style={{ boxShadow: "0 0 20px rgba(184,79,255,0.2)" }}>
                  <Plus size={14} />CREATE CODE
                </button>
              ) : (
                <div className="race-card p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="section-label">NEW PRO CODE</p>
                    <button onClick={() => setShowNewCode(false)} className="text-race-dim hover:text-race-text"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="section-label block mb-1">CODE</label>
                      <input type="text" value={newCode.code} onChange={(e) => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MY-CODE-2025" className="input-field tracking-widest uppercase" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">DESCRIPTION</label>
                      <input type="text" value={newCode.description} onChange={(e) => setNewCode(p => ({ ...p, description: e.target.value }))} placeholder="Friends & family" className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">MAX USES</label>
                      <input type="number" value={newCode.max_uses} onChange={(e) => setNewCode(p => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" className="input-field" />
                    </div>
                  </div>
                  <button onClick={createCode} disabled={!newCode.code || loading === "new-code"} className="mt-3 flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded transition-all">
                    {loading === "new-code" ? "CREATING..." : <><Plus size={12} />CREATE CODE</>}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {proCodes.map((code) => (
                <div key={code.id} className="race-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-neon-purple tracking-widest text-sm">{code.code}</p>
                      <p className="text-race-dim text-xs font-mono">{code.description || "No description"}</p>
                      <p className="text-race-dim/60 text-[10px] font-mono mt-0.5">{code.use_count} used · {code.max_uses ? `${code.max_uses} max` : "unlimited"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleCode(code.id, code.active)}
                        disabled={loading === `code-${code.id}`}
                        className={clsx(
                          "px-2.5 py-1 rounded text-xs font-mono font-bold transition-all",
                          code.active ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-race-muted text-race-dim border border-race-border"
                        )}
                      >
                        {loading === `code-${code.id}` ? "..." : code.active ? "ACTIVE" : "OFF"}
                      </button>
                      <button onClick={() => deleteCode(code.id)} disabled={loading === `del-code-${code.id}`} className="p-1.5 text-race-dim hover:text-red-400 transition-colors">
                        {loading === `del-code-${code.id}` ? "..." : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEASONS TAB ── */}
        {tab === "seasons" && (
          <div>
            <div className="mb-4">
              {!showNewSeason ? (
                <button onClick={() => setShowNewSeason(true)} className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all" style={{ boxShadow: "0 0 20px rgba(184,79,255,0.2)" }}>
                  <Plus size={14} />CREATE SEASON
                </button>
              ) : (
                <div className="race-card p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="section-label">NEW SEASON</p>
                    <button onClick={() => setShowNewSeason(false)} className="text-race-dim hover:text-race-text"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="section-label block mb-1">NAME</label>
                      <input type="text" value={newSeason.name} onChange={(e) => setNewSeason(p => ({ ...p, name: e.target.value }))} placeholder="Season 1 — 2025" className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">START DATE</label>
                      <input type="date" value={newSeason.start_date} onChange={(e) => setNewSeason(p => ({ ...p, start_date: e.target.value }))} className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">END DATE</label>
                      <input type="date" value={newSeason.end_date} onChange={(e) => setNewSeason(p => ({ ...p, end_date: e.target.value }))} className="input-field" />
                    </div>
                  </div>
                  <button onClick={createSeason} disabled={!newSeason.name || !newSeason.start_date || !newSeason.end_date || loading === "new-season"} className="mt-3 flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded transition-all">
                    {loading === "new-season" ? "CREATING..." : <><Plus size={12} />CREATE SEASON</>}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {seasons.length === 0 ? (
                <div className="race-card p-8 text-center text-race-dim font-mono text-sm">NO SEASONS YET</div>
              ) : seasons.map((season) => (
                <div key={season.id} className="race-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-race-text text-sm">{season.name}</p>
                      <p className="text-race-dim text-xs font-mono mt-0.5">{season.start_date} → {season.end_date}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {season.is_active ? (
                        <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">ACTIVE</span>
                      ) : null}
                      <button
                        onClick={() => toggleSeason(season.id, season.is_active)}
                        disabled={loading === `season-${season.id}`}
                        className={clsx(
                          "px-2.5 py-1 rounded text-xs font-mono font-bold transition-all",
                          season.is_active
                            ? "bg-race-muted text-race-dim border border-race-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                            : "bg-neon-purple/10 text-neon-purple border border-neon-purple/20 hover:bg-neon-purple hover:text-white"
                        )}
                      >
                        {loading === `season-${season.id}` ? "..." : season.is_active ? "DEACTIVATE" : "ACTIVATE"}
                      </button>
                      <button onClick={() => deleteSeason(season.id)} disabled={!!loading} className="p-1.5 text-race-dim hover:text-red-400 transition-colors">
                        {loading === `del-season-${season.id}` ? "..." : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHALLENGES TAB ── */}
        {tab === "challenges" && (
          <div>
            <div className="mb-4">
              {!showNewChallenge ? (
                <button onClick={() => setShowNewChallenge(true)} className="flex items-center gap-2 px-4 py-2.5 bg-neon-green/90 hover:bg-neon-green text-black text-xs font-mono font-bold tracking-widest rounded-lg transition-all">
                  <Plus size={14} />CREATE CHALLENGE
                </button>
              ) : (
                <div className="race-card p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="section-label">NEW CHALLENGE</p>
                    <button onClick={() => setShowNewChallenge(false)} className="text-race-dim hover:text-race-text"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <label className="section-label block mb-1">CHALLENGE NAME</label>
                      <input type="text" value={newChallenge.name} onChange={(e) => setNewChallenge(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Spa GT3 Shootout" className="input-field" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="section-label block mb-1">DESCRIPTION (optional)</label>
                      <input type="text" value={newChallenge.description} onChange={(e) => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Fastest lap at Spa in any GT3 car" className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">CAR (specific)</label>
                      <select value={newChallenge.car_id} onChange={(e) => setNewChallenge(p => ({ ...p, car_id: e.target.value, car_class: "" }))} className="input-field">
                        <option value="">— Any car —</option>
                        {cars.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="section-label block mb-1">OR CAR CLASS</label>
                      <select value={newChallenge.car_class} onChange={(e) => setNewChallenge(p => ({ ...p, car_class: e.target.value, car_id: "" }))} className="input-field">
                        <option value="">— Any class —</option>
                        {[...new Set(cars.map((c: any) => c.class).filter(Boolean))].map((cls: any) => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="section-label block mb-1">TRACK</label>
                      <select value={newChallenge.track_id} onChange={(e) => setNewChallenge(p => ({ ...p, track_id: e.target.value }))} className="input-field">
                        <option value="">— Select track —</option>
                        {tracks.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="section-label block mb-1">BONUS POINTS</label>
                      <input type="number" value={newChallenge.bonus_points} onChange={(e) => setNewChallenge(p => ({ ...p, bonus_points: e.target.value }))} min="1" max="50" className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">START DATE</label>
                      <input type="date" value={newChallenge.start_date} onChange={(e) => setNewChallenge(p => ({ ...p, start_date: e.target.value }))} className="input-field" />
                    </div>
                    <div>
                      <label className="section-label block mb-1">END DATE</label>
                      <input type="date" value={newChallenge.end_date} onChange={(e) => setNewChallenge(p => ({ ...p, end_date: e.target.value }))} className="input-field" />
                    </div>
                  </div>
                  <button onClick={createChallenge} disabled={loading === "new-challenge"} className="flex items-center gap-2 px-4 py-2 bg-neon-green/90 hover:bg-neon-green disabled:opacity-50 text-black text-xs font-mono font-bold tracking-widest rounded transition-all">
                    {loading === "new-challenge" ? "CREATING..." : <><Plus size={12} />CREATE CHALLENGE</>}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {challenges.length === 0 ? (
                <div className="race-card p-8 text-center text-race-dim font-mono text-sm">NO CHALLENGES YET</div>
              ) : challenges.map((ch) => {
                const today = new Date().toISOString().slice(0, 10);
                const isActive = ch.start_date <= today && ch.end_date >= today;
                return (
                  <div key={ch.id} className="race-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-race-text text-sm">{ch.name}</span>
                          {isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-green/10 text-neon-green border border-neon-green/20">LIVE</span>}
                          <span className="text-neon-green font-mono font-bold text-xs">+{ch.bonus_points}pts</span>
                        </div>
                        <p className="text-race-dim text-xs font-mono">{ch.description || "—"}</p>
                        <p className="text-race-dim/60 text-[10px] font-mono mt-0.5">{ch.start_date} → {ch.end_date}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => finalizeChallenge(ch.id)} disabled={!!loading} className="px-2.5 py-1 text-xs font-mono text-neon-green border border-neon-green/30 rounded hover:bg-neon-green/10 transition-all whitespace-nowrap">
                          {loading === `fin-ch-${ch.id}` ? "..." : "🏁 AWARD"}
                        </button>
                        <button onClick={() => deleteChallenge(ch.id)} disabled={!!loading} className="p-1.5 text-race-dim hover:text-red-400 transition-colors">
                          {loading === `del-ch-${ch.id}` ? "..." : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── H2H TAB ── */}
        {tab === "h2h" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-race-text tracking-widest text-sm sm:text-base">HEAD-TO-HEAD EVENTS</h2>
              <button onClick={() => setShowNewH2H(!showNewH2H)} className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-mono rounded hover:bg-neon-purple/20 transition-all">
                <Plus size={13} />NEW EVENT
              </button>
            </div>

            {showNewH2H && (
              <div className="race-card p-5 border-neon-purple/20 space-y-3">
                <p className="section-label">CREATE H2H EVENT</p>
                <input className="input-field" placeholder="Event name" value={newH2H.name} onChange={(e) => setNewH2H((p) => ({ ...p, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="section-label block mb-1">START DATE</label><input type="date" className="input-field" value={newH2H.start_date} onChange={(e) => setNewH2H((p) => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><label className="section-label block mb-1">END DATE</label><input type="date" className="input-field" value={newH2H.end_date} onChange={(e) => setNewH2H((p) => ({ ...p, end_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="section-label block mb-1">WIN POINTS</label>
                    <input type="number" className="input-field" value={newH2H.points_win} onChange={(e) => setNewH2H((p) => ({ ...p, points_win: e.target.value }))} />
                  </div>
                  <div>
                    <label className="section-label block mb-1">DEFAULT CAR (fallback)</label>
                    <select className="input-field" value={newH2H.default_car_id} onChange={(e) => setNewH2H((p) => ({ ...p, default_car_id: e.target.value }))}>
                      <option value="">— NONE —</option>
                      {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="section-label block mb-1">DEFAULT TRACK (fallback)</label>
                    <select className="input-field" value={newH2H.default_track_id} onChange={(e) => setNewH2H((p) => ({ ...p, default_track_id: e.target.value }))}>
                      <option value="">— NONE —</option>
                      {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-race-dim/60 text-xs font-mono">Default car/track is used for pairs with no shared combos.</p>
                <div className="flex gap-2">
                  <button onClick={createH2HEvent} disabled={!newH2H.name || !newH2H.start_date || !newH2H.end_date || loading === "new-h2h"} className="flex-1 py-2.5 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all">
                    {loading === "new-h2h" ? "CREATING..." : "CREATE EVENT"}
                  </button>
                  <button onClick={() => setShowNewH2H(false)} className="px-4 py-2.5 border border-race-border text-race-dim text-xs font-mono rounded-lg hover:text-race-text transition-colors">CANCEL</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {h2hEvents.length === 0 ? (
                <div className="race-card p-8 text-center text-race-dim font-mono text-sm">NO H2H EVENTS YET</div>
              ) : h2hEvents.map((ev) => (
                <div key={ev.id} className="race-card p-4">
                  <div className="flex items-start gap-3">
                    <Swords size={15} className="text-neon-purple flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono font-bold text-race-text text-sm">{ev.name}</span>
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border",
                          ev.status === "active" ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                          ev.status === "completed" ? "bg-race-muted text-race-dim border-race-border" :
                          "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                        )}>{ev.status.toUpperCase()}</span>
                      </div>
                      <p className="text-race-dim text-xs font-mono">{ev.start_date} → {ev.end_date} · +{ev.points_win} pts</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ev.status === "pending" && (
                          <button onClick={() => generateH2H(ev.id)} disabled={!!loading} className="px-3 py-1 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-mono rounded hover:bg-neon-purple/20 transition-all">
                            {loading === `gen-${ev.id}` ? "..." : "⚡ GENERATE PAIRS"}
                          </button>
                        )}
                        {ev.status === "active" && (
                          <button onClick={() => finalizeH2H(ev.id)} disabled={!!loading} className="px-3 py-1 bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-mono rounded hover:bg-neon-green/20 transition-all">
                            {loading === `fin-${ev.id}` ? "..." : "🏁 FINALIZE & AWARD"}
                          </button>
                        )}
                        <button onClick={() => deleteH2H(ev.id)} disabled={!!loading} className="px-3 py-1 border border-red-500/20 text-red-400 text-xs font-mono rounded hover:bg-red-500/10 transition-all">
                          {loading === `del-h2h-${ev.id}` ? "..." : "DELETE"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

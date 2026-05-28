"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Users, Timer, Key, Trash2, Crown, Zap, Plus, X, Check, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "@/utils/lapTime";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface AdminDashboardProps {
  currentUser: any;
  users: any[];
  lapTimes: any[];
  proCodes: any[];
}

type Tab = "users" | "laps" | "codes";

export function AdminDashboard({ currentUser, users, lapTimes, proCodes }: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newCode, setNewCode] = useState({ code: "", description: "", max_uses: "" });
  const [showNewCode, setShowNewCode] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleAdmin = async (userId: string, currentValue: boolean) => {
    if (userId === currentUser.id) return;
    setLoading(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ is_admin: !currentValue })
      .eq("id", userId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", `Admin status updated`); router.refresh(); }
    setLoading(null);
  };

  const togglePro = async (userId: string, currentValue: boolean) => {
    setLoading(`pro-${userId}`);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ is_pro: !currentValue, pro_since: !currentValue ? new Date().toISOString() : null })
      .eq("id", userId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", `PRO status updated`); router.refresh(); }
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
    const { error } = await supabase
      .from("pro_codes")
      .update({ active: !currentValue })
      .eq("id", codeId);
    if (error) showMessage("error", error.message);
    else { showMessage("success", `Code ${currentValue ? "deactivated" : "activated"}`); router.refresh(); }
    setLoading(null);
  };

  const createCode = async () => {
    if (!newCode.code.trim()) return;
    setLoading("new-code");
    const supabase = createClient();
    const { error } = await supabase.from("pro_codes").insert({
      code: newCode.code.toUpperCase().trim(),
      description: newCode.description || null,
      max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
      active: true,
    });
    if (error) showMessage("error", error.message);
    else {
      showMessage("success", "Code created!");
      setNewCode({ code: "", description: "", max_uses: "" });
      setShowNewCode(false);
      router.refresh();
    }
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

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "users", label: "DRIVERS", icon: Users, count: users.length },
    { id: "laps", label: "LAP TIMES", icon: Timer, count: lapTimes.length },
    { id: "codes", label: "PRO CODES", icon: Key, count: proCodes.length },
  ];

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">ADMIN</h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">APEX TIMING CONTROL PANEL</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Shield size={12} className="text-red-400" />
            <span className="text-red-400 text-xs font-mono font-bold">{currentUser.driver_name.toUpperCase()}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "TOTAL DRIVERS", value: users.length, color: "text-neon-purple" },
            { label: "TOTAL LAPS", value: lapTimes.length, color: "text-neon-green" },
            { label: "PRO MEMBERS", value: users.filter(u => u.is_pro).length, color: "text-lap-gold" },
          ].map((stat) => (
            <div key={stat.label} className="race-card p-5">
              <p className="section-label mb-2">{stat.label}</p>
              <p className={`font-display font-black text-4xl ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={clsx(
            "flex items-center gap-2 p-3 rounded-lg mb-4 text-sm font-mono animate-fade-in",
            message.type === "success"
              ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            {message.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-race-card border border-race-border rounded-lg p-1">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-xs font-mono font-medium tracking-widest transition-all",
                tab === id
                  ? "bg-neon-purple text-white"
                  : "text-race-dim hover:text-race-text"
              )}
            >
              <Icon size={13} />
              {label}
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs",
                tab === id ? "bg-white/20" : "bg-race-muted"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="race-card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-race-border bg-race-dark px-4 py-3">
              {["DRIVER", "EMAIL", "PRO", "ADMIN", "ACTIONS"].map((col) => (
                <div key={col} className="text-xs font-mono text-race-dim tracking-widest">{col}</div>
              ))}
            </div>
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-race-border/40 items-center px-4 py-3 hover:bg-race-muted/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-race-text text-sm">{user.driver_name}</span>
                    {user.id === currentUser.id && <Badge variant="purple" size="sm">YOU</Badge>}
                    {user.is_admin && <Badge variant="muted" size="sm">ADMIN</Badge>}
                  </div>
                  {user.team_name && <p className="text-race-dim text-xs font-mono">{user.team_name}</p>}
                </div>
                <div className="px-4">
                  <span className="text-race-dim text-xs font-mono">{user.email}</span>
                </div>
                <div className="px-4">
                  <button
                    onClick={() => togglePro(user.id, user.is_pro)}
                    disabled={loading === `pro-${user.id}`}
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-mono font-bold transition-all",
                      user.is_pro
                        ? "bg-lap-gold/10 text-lap-gold border border-lap-gold/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                        : "bg-race-muted text-race-dim border border-race-border hover:bg-lap-gold/10 hover:text-lap-gold hover:border-lap-gold/20"
                    )}
                  >
                    {loading === `pro-${user.id}` ? "..." : user.is_pro ? "⚡ PRO" : "FREE"}
                  </button>
                </div>
                <div className="px-4">
                  <button
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                    disabled={loading === user.id || user.id === currentUser.id}
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-mono font-bold transition-all disabled:opacity-40",
                      user.is_admin
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-race-muted hover:text-race-dim hover:border-race-border"
                        : "bg-race-muted text-race-dim border border-race-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                    )}
                  >
                    {loading === user.id ? "..." : user.is_admin ? "ADMIN" : "USER"}
                  </button>
                </div>
                <div className="px-4 text-xs font-mono text-race-dim">
                  {formatRelativeTime(user.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LAPS TAB */}
        {tab === "laps" && (
          <div className="race-card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-0 border-b border-race-border bg-race-dark px-4 py-3">
              {["DRIVER", "CAR · TRACK", "TIME", "DATE", "DELETE"].map((col) => (
                <div key={col} className="text-xs font-mono text-race-dim tracking-widest">{col}</div>
              ))}
            </div>
            {lapTimes.map((lap) => (
              <div key={lap.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-0 border-b border-race-border/40 items-center px-4 py-3 hover:bg-race-muted/30 transition-colors">
                <span className="font-mono font-bold text-race-text text-sm">
                  {(lap.users as any)?.driver_name?.toUpperCase()}
                </span>
                <div>
                  <p className="text-race-dim text-xs font-mono">{(lap.cars as any)?.name}</p>
                  <p className="text-race-dim text-xs font-mono">{(lap.tracks as any)?.name}</p>
                </div>
                <span className="lap-time-display text-base">{lap.lap_time_formatted}</span>
                <span className="text-race-dim text-xs font-mono px-4">{formatRelativeTime(lap.submitted_at)}</span>
                <button
                  onClick={() => deleteLap(lap.id)}
                  disabled={loading === lap.id}
                  className="p-2 text-race-dim hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {loading === lap.id ? "..." : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CODES TAB */}
        {tab === "codes" && (
          <div>
            {/* New code button */}
            <div className="mb-4">
              {!showNewCode ? (
                <button
                  onClick={() => setShowNewCode(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                  style={{ boxShadow: "0 0 20px rgba(184,79,255,0.2)" }}
                >
                  <Plus size={14} />CREATE NEW CODE
                </button>
              ) : (
                <div className="race-card p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="section-label">NEW PRO CODE</p>
                    <button onClick={() => setShowNewCode(false)} className="text-race-dim hover:text-race-text">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="section-label block mb-1">CODE</label>
                      <input
                        type="text"
                        value={newCode.code}
                        onChange={(e) => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="MY-CODE-2025"
                        className="input-field tracking-widest uppercase"
                      />
                    </div>
                    <div>
                      <label className="section-label block mb-1">DESCRIPTION</label>
                      <input
                        type="text"
                        value={newCode.description}
                        onChange={(e) => setNewCode(p => ({ ...p, description: e.target.value }))}
                        placeholder="Friends & family"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="section-label block mb-1">MAX USES (blank = unlimited)</label>
                      <input
                        type="number"
                        value={newCode.max_uses}
                        onChange={(e) => setNewCode(p => ({ ...p, max_uses: e.target.value }))}
                        placeholder="10"
                        className="input-field"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createCode}
                    disabled={!newCode.code || loading === "new-code"}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded transition-all"
                  >
                    {loading === "new-code" ? "CREATING..." : <><Plus size={12} />CREATE CODE</>}
                  </button>
                </div>
              )}
            </div>

            <div className="race-card overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-0 border-b border-race-border bg-race-dark px-4 py-3">
                {["CODE", "DESCRIPTION", "USES", "MAX", "STATUS", "ACTIONS"].map((col) => (
                  <div key={col} className="text-xs font-mono text-race-dim tracking-widest">{col}</div>
                ))}
              </div>
              {proCodes.map((code) => (
                <div key={code.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-0 border-b border-race-border/40 items-center px-4 py-3 hover:bg-race-muted/30 transition-colors">
                  <span className="font-mono font-bold text-neon-purple tracking-widest text-sm">{code.code}</span>
                  <span className="text-race-dim text-xs font-mono">{code.description || "—"}</span>
                  <span className="text-race-text font-mono font-bold text-sm px-4">{code.use_count}</span>
                  <span className="text-race-dim font-mono text-sm px-4">{code.max_uses ?? "∞"}</span>
                  <div className="px-4">
                    <button
                      onClick={() => toggleCode(code.id, code.active)}
                      disabled={loading === `code-${code.id}`}
                      className={clsx(
                        "px-2 py-1 rounded text-xs font-mono font-bold transition-all",
                        code.active
                          ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                          : "bg-race-muted text-race-dim border border-race-border"
                      )}
                    >
                      {loading === `code-${code.id}` ? "..." : code.active ? "ACTIVE" : "INACTIVE"}
                    </button>
                  </div>
                  <button
                    onClick={() => deleteCode(code.id)}
                    disabled={loading === `del-code-${code.id}`}
                    className="p-2 text-race-dim hover:text-red-400 transition-colors"
                  >
                    {loading === `del-code-${code.id}` ? "..." : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

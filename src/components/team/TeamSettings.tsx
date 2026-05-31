"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Users, LogOut, Plus, Link2, AlertCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

interface TeamSettingsProps {
  userId: string;
  teamName: string | null;
  existingInviteCode: string | null;
}

export function TeamSettings({ userId, teamName, existingInviteCode }: TeamSettingsProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(existingInviteCode);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const generateInvite = async () => {
    setLoading("invite");
    const res = await fetch("/api/team/invite", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { showMsg("error", data.error); }
    else { setInviteCode(data.invite_code); }
    setLoading(null);
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinTeam = async () => {
    if (!joinCode.trim()) return;
    setLoading("join");
    const res = await fetch("/api/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showMsg("error", data.error); }
    else {
      showMsg("success", `Joined team "${data.team_name}"!`);
      setTimeout(() => { router.refresh(); }, 1200);
    }
    setLoading(null);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setLoading("create");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ team_name: newTeamName.trim() })
      .eq("id", userId);
    if (error) { showMsg("error", error.message); }
    else {
      showMsg("success", `Team "${newTeamName.trim()}" created!`);
      setTimeout(() => { router.refresh(); }, 1200);
    }
    setLoading(null);
  };

  const renameTeam = async () => {
    if (!renameValue.trim()) return;
    setLoading("rename");
    const res = await fetch("/api/team/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: renameValue.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showMsg("error", data.error); }
    else {
      showMsg("success", `Team renamed to "${data.team_name}"!`);
      setShowRename(false);
      setRenameValue("");
      setTimeout(() => { router.refresh(); }, 1200);
    }
    setLoading(null);
  };

  const leaveTeam = async () => {
    if (!confirm(`Leave team "${teamName}"? You can rejoin with an invite code.`)) return;
    setLoading("leave");
    const res = await fetch("/api/team/leave", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { showMsg("error", data.error); }
    else {
      showMsg("success", "You've left the team.");
      setTimeout(() => { router.refresh(); }, 1200);
    }
    setLoading(null);
  };

  return (
    <div className="race-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Link2 size={16} className="text-neon-purple" />
        <h3 className="font-display font-bold text-race-text tracking-widest text-sm">TEAM SETTINGS</h3>
      </div>

      {message && (
        <div className={clsx(
          "flex items-center gap-2 p-3 rounded-lg mb-4 text-xs font-mono",
          message.type === "success"
            ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        )}>
          {message.type === "error" && <AlertCircle size={12} />}
          {message.type === "success" && <Check size={12} />}
          {message.text}
        </div>
      )}

      {teamName ? (
        <div className="space-y-4">
          {/* Invite code section */}
          <div>
            <p className="section-label mb-2">TEAM INVITE CODE</p>
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-race-dark border border-race-border rounded-lg px-4 py-3 font-mono font-bold text-lg tracking-[0.3em] text-neon-purple text-center select-all">
                  {inviteCode}
                </div>
                <button
                  onClick={copyCode}
                  className="p-3 bg-race-dark border border-race-border rounded-lg hover:border-neon-purple/40 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} className="text-race-dim" />}
                </button>
              </div>
            ) : (
              <button
                onClick={generateInvite}
                disabled={loading === "invite"}
                className="w-full flex items-center justify-center gap-2 py-3 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                {loading === "invite" ? "GENERATING..." : <><Plus size={13} />GENERATE INVITE CODE</>}
              </button>
            )}
            {inviteCode && (
              <p className="text-race-dim/60 text-xs font-mono mt-2 text-center">
                Share this code with teammates to invite them to <span className="text-race-dim">{teamName}</span>
              </p>
            )}
          </div>

          {/* Rename team */}
          <div className="pt-3 border-t border-race-border">
            {!showRename ? (
              <button
                onClick={() => { setShowRename(true); setRenameValue(teamName || ""); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-mono text-race-dim hover:text-race-text border border-race-border hover:border-race-border/60 rounded-lg transition-all"
              >
                <Pencil size={13} />RENAME TEAM
              </button>
            ) : (
              <div className="space-y-2">
                <p className="section-label">NEW TEAM NAME</p>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter new team name"
                  className="input-field"
                  maxLength={32}
                />
                <div className="flex gap-2">
                  <button
                    onClick={renameTeam}
                    disabled={!renameValue.trim() || loading === "rename"}
                    className="flex-1 py-2.5 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                  >
                    {loading === "rename" ? "RENAMING..." : "CONFIRM RENAME"}
                  </button>
                  <button onClick={() => { setShowRename(false); setRenameValue(""); }} className="px-4 py-2.5 border border-race-border text-race-dim text-xs font-mono rounded-lg hover:text-race-text transition-colors">
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leave team */}
          <div className="border-t border-race-border">
            <button
              onClick={leaveTeam}
              disabled={loading === "leave"}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-mono text-red-400/70 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-lg transition-all"
            >
              <LogOut size={13} />
              {loading === "leave" ? "LEAVING..." : "LEAVE TEAM"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Join via code */}
          <div>
            {!showJoin ? (
              <button
                onClick={() => { setShowJoin(true); setShowCreate(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                <Users size={13} />JOIN A TEAM
              </button>
            ) : (
              <div className="space-y-2">
                <p className="section-label">ENTER INVITE CODE</p>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="input-field tracking-[0.3em] text-center font-mono text-lg uppercase"
                  maxLength={8}
                />
                <div className="flex gap-2">
                  <button
                    onClick={joinTeam}
                    disabled={!joinCode.trim() || loading === "join"}
                    className="flex-1 py-2.5 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                  >
                    {loading === "join" ? "JOINING..." : "JOIN TEAM"}
                  </button>
                  <button onClick={() => { setShowJoin(false); setJoinCode(""); }} className="px-4 py-2.5 border border-race-border text-race-dim text-xs font-mono rounded-lg hover:text-race-text transition-colors">
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create new team */}
          <div>
            {!showCreate ? (
              <button
                onClick={() => { setShowCreate(true); setShowJoin(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-race-dark hover:bg-race-muted border border-race-border text-race-dim hover:text-race-text text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                <Plus size={13} />CREATE NEW TEAM
              </button>
            ) : (
              <div className="space-y-2">
                <p className="section-label">TEAM NAME</p>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Apex Racing Club"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createTeam}
                    disabled={!newTeamName.trim() || loading === "create"}
                    className="flex-1 py-2.5 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all"
                  >
                    {loading === "create" ? "CREATING..." : "CREATE TEAM"}
                  </button>
                  <button onClick={() => { setShowCreate(false); setNewTeamName(""); }} className="px-4 py-2.5 border border-race-border text-race-dim text-xs font-mono rounded-lg hover:text-race-text transition-colors">
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

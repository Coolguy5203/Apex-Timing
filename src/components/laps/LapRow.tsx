"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { formatRelativeTime } from "@/utils/lapTime";

const statusConfig = {
  valid: { label: "VALID", color: "text-race-dim", bg: "bg-race-muted", border: "border-race-border", dot: "bg-race-dim" },
  approved: { label: "VERIFIED", color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30", dot: "bg-neon-green" },
  flagged: { label: "UNDER REVIEW", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", dot: "bg-yellow-400 animate-pulse" },
} as const;

interface LapRowProps {
  lap: {
    id: string;
    lap_time_formatted: string;
    submitted_at: string;
    notes?: string | null;
    validation_status: string;
    flag_reason?: string | null;
    laps_in_session?: number | null;
    car: { name: string };
    track: { name: string };
  };
}

export function LapRow({ lap }: LapRowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = (lap.validation_status in statusConfig
    ? lap.validation_status
    : "valid") as keyof typeof statusConfig;
  const cfg = statusConfig[status];

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/laps/${lap.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 px-5 py-4 border-b border-race-border/50 last:border-0 items-start hover:bg-race-muted/20 transition-colors group">
      <Link href={`/recap/${lap.id}`} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-4 items-center min-w-0">
        <div className="min-w-0">
          <p className="text-race-text text-sm font-mono font-bold truncate group-hover:text-neon-purple transition-colors">{lap.car.name}</p>
          <p className="text-race-dim text-xs font-mono flex items-center gap-1 mt-0.5 truncate">
            <MapPin size={9} />{lap.track.name}
          </p>
          <p className="text-race-dim/50 text-xs font-mono mt-0.5 flex items-center gap-1">
            <Clock size={9} />{formatRelativeTime(lap.submitted_at)}
          </p>
          {lap.flag_reason && status === "flagged" && (
            <p className="text-yellow-400/70 text-[10px] font-mono mt-1 truncate">Reason: {lap.flag_reason}</p>
          )}
          {lap.notes && (
            <p className="text-race-dim/50 text-[10px] font-mono mt-0.5 italic truncate">"{lap.notes}"</p>
          )}
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-race-dim text-sm font-mono">{lap.laps_in_session ?? "—"}</p>
        </div>

        <div className="text-right">
          <p className={clsx("text-sm font-mono font-bold", status === "approved" ? "text-neon-green" : status === "flagged" ? "text-yellow-400/80" : "text-neon-purple")}>
            {lap.lap_time_formatted}
          </p>
        </div>

        <div className="text-right">
          <span className={clsx("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold border", cfg.bg, cfg.border, cfg.color)}>
            <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
            {status === "approved" && <ShieldCheck size={9} />}
            {status === "flagged" && <AlertTriangle size={9} />}
            {cfg.label}
          </span>
        </div>
      </Link>

      {/* Delete button */}
      <div className="flex items-center pt-1">
        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono rounded hover:bg-red-500/30 transition-colors"
            >
              {deleting ? "..." : "CONFIRM"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 border border-race-border text-race-dim text-[10px] font-mono rounded hover:text-race-text transition-colors"
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="p-1.5 text-race-dim/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete this lap"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, formatRelativeTime } from "@/utils/lapTime";
import { Timer, MapPin, ShieldCheck, AlertTriangle, Clock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default async function MyLapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: laps } = await supabase
    .from("lap_times")
    .select(`
      id, lap_time_ms, lap_time_formatted, submitted_at, notes,
      validation_status, flag_reason, laps_in_session,
      cars(id, name, class),
      tracks(id, name)
    `)
    .eq("driver_id", user.id)
    .order("submitted_at", { ascending: false });

  const allLaps = laps || [];

  const counts = {
    total: allLaps.length,
    valid: allLaps.filter((l) => l.validation_status === "valid").length,
    approved: allLaps.filter((l) => l.validation_status === "approved").length,
    flagged: allLaps.filter((l) => l.validation_status === "flagged").length,
  };

  const statusConfig = {
    valid: { label: "VALID", color: "text-race-dim", bg: "bg-race-muted", border: "border-race-border", dot: "bg-race-dim" },
    approved: { label: "VERIFIED", color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30", dot: "bg-neon-green" },
    flagged: { label: "UNDER REVIEW", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", dot: "bg-yellow-400 animate-pulse" },
  } as const;

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="inline-flex items-center gap-2 text-race-dim hover:text-race-text text-xs font-mono transition-colors">
            <ChevronLeft size={14} />BACK
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Timer size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-3xl text-race-text tracking-wider">MY SUBMISSIONS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">ALL YOUR LAP SUBMISSIONS & THEIR STATUS</p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "TOTAL", value: counts.total, color: "text-race-text" },
            { label: "VALID", value: counts.valid, color: "text-race-dim" },
            { label: "VERIFIED", value: counts.approved, color: "text-neon-green" },
            { label: "UNDER REVIEW", value: counts.flagged, color: "text-yellow-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="race-card p-4 text-center">
              <p className="section-label mb-1">{label}</p>
              <p className={`font-display font-black text-3xl ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {allLaps.length === 0 ? (
          <div className="race-card p-16 text-center">
            <Timer size={40} className="text-race-dim/20 mx-auto mb-4" />
            <p className="font-display font-bold text-race-text tracking-widest mb-2">NO LAPS YET</p>
            <p className="text-race-dim text-xs font-mono mb-6">Your submitted laps will appear here with their status.</p>
            <Link href="/submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-bold tracking-widest rounded-lg transition-all">
              SUBMIT YOUR FIRST LAP
            </Link>
          </div>
        ) : (
          <div className="race-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
              <div>CAR · CIRCUIT</div>
              <div className="hidden sm:block text-right">SESSION LAPS</div>
              <div className="text-right">TIME</div>
              <div className="text-right">STATUS</div>
            </div>

            {allLaps.map((lap) => {
              const car = lap.cars as any;
              const track = lap.tracks as any;
              const status = (lap.validation_status as keyof typeof statusConfig) in statusConfig
                ? (lap.validation_status as keyof typeof statusConfig)
                : "valid";
              const cfg = statusConfig[status];

              return (
                <Link
                  key={lap.id}
                  href={`/recap/${lap.id}`}
                  className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 border-b border-race-border/50 last:border-0 items-center hover:bg-race-muted/20 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-race-text text-sm font-mono font-bold truncate group-hover:text-neon-purple transition-colors">{car?.name}</p>
                    <p className="text-race-dim text-xs font-mono flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={9} />{track?.name}
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
                    <p className="text-race-dim text-sm font-mono">{(lap as any).laps_in_session ?? "—"}</p>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

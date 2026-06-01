import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Timer, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LapRow } from "@/components/laps/LapRow";

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

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-2">
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
            <div className="grid grid-cols-[1fr_auto] gap-2 px-5 py-3 bg-race-dark border-b border-race-border">
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-mono text-race-dim tracking-widest">
                <div>CAR · CIRCUIT</div>
                <div className="hidden sm:block text-right">SESSION LAPS</div>
                <div className="text-right">TIME</div>
                <div className="text-right">STATUS</div>
              </div>
              <div className="w-8" />
            </div>

            {allLaps.map((lap) => (
              <LapRow
                key={lap.id}
                lap={{
                  id: lap.id,
                  lap_time_formatted: lap.lap_time_formatted,
                  submitted_at: lap.submitted_at,
                  notes: lap.notes,
                  validation_status: lap.validation_status,
                  flag_reason: lap.flag_reason,
                  laps_in_session: (lap as any).laps_in_session,
                  car: { name: (lap.cars as any)?.name ?? "Unknown" },
                  track: { name: (lap.tracks as any)?.name ?? "Unknown" },
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseLapTime, formatLapTime } from "@/utils/lapTime";
import type { Car, Track } from "@/types";
import { Flag, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface SubmitLapFormProps {
  cars: Car[];
  tracks: Track[];
  userId: string;
  driverName: string;
  teamName?: string;
}

export function SubmitLapForm({ cars, tracks, userId, driverName, teamName }: SubmitLapFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({ car_id: "", track_id: "", lap_time: "", notes: "", laps_in_session: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewTime, setPreviewTime] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.car_id) newErrors.car_id = "Select a car";
    if (!formData.track_id) newErrors.track_id = "Select a track";
    if (!formData.lap_time) {
      newErrors.lap_time = "Enter a lap time";
    } else {
      const ms = parseLapTime(formData.lap_time);
      if (ms === null) newErrors.lap_time = "Format must be M:SS.mmm (e.g. 1:23.456)";
      else if (ms < 10000) newErrors.lap_time = "Lap time seems too fast (< 10 seconds)";
      else if (ms > 600000) newErrors.lap_time = "Lap time seems too slow (> 10 minutes)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLapTimeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, lap_time: value }));
    const ms = parseLapTime(value);
    setPreviewTime(ms !== null ? formatLapTime(ms) : null);
    if (errors.lap_time) setErrors((prev) => ({ ...prev, lap_time: "" }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const lap_time_ms = parseLapTime(formData.lap_time)!;
      const { error } = await supabase.from("lap_times").insert({
        driver_id: userId,
        car_id: formData.car_id,
        track_id: formData.track_id,
        lap_time_ms,
        lap_time_formatted: formatLapTime(lap_time_ms),
        notes: formData.notes || null,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;

      const selectedCar = cars.find((c) => c.id === formData.car_id);
      const selectedTrack = tracks.find((t) => t.id === formData.track_id);
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_name: driverName,
          team_name: teamName,
          lap_time: formatLapTime(lap_time_ms),
          car_name: selectedCar?.name ?? "Unknown",
          track_name: selectedTrack?.name ?? "Unknown",
        }),
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => { router.push("/leaderboard"); router.refresh(); }, 2000);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to submit. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="race-card p-12 text-center">
        <CheckCircle2 size={48} className="text-neon-green mx-auto mb-4" />
        <h3 className="font-display font-bold text-2xl text-race-text mb-2">LAP TIME POSTED</h3>
        <p className="text-race-dim font-mono text-sm">{previewTime}</p>
        <p className="text-race-dim/60 font-mono text-xs mt-4">Redirecting to leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="race-card p-6 md:p-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="section-label block mb-2">CAR</label>
            <div className="relative">
              <select
                value={formData.car_id}
                onChange={(e) => { setFormData((p) => ({ ...p, car_id: e.target.value })); if (errors.car_id) setErrors((p) => ({ ...p, car_id: "" })); }}
                className={clsx("input-field appearance-none pr-10 cursor-pointer", errors.car_id && "border-red-500/50")}
              >
                <option value="">— SELECT CAR —</option>
                {cars.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
            </div>
            {errors.car_id && <p className="mt-1.5 text-red-400 text-xs font-mono flex items-center gap-1"><AlertCircle size={10} />{errors.car_id}</p>}
          </div>
          <div>
            <label className="section-label block mb-2">CIRCUIT</label>
            <div className="relative">
              <select
                value={formData.track_id}
                onChange={(e) => { setFormData((p) => ({ ...p, track_id: e.target.value })); if (errors.track_id) setErrors((p) => ({ ...p, track_id: "" })); }}
                className={clsx("input-field appearance-none pr-10 cursor-pointer", errors.track_id && "border-red-500/50")}
              >
                <option value="">— SELECT CIRCUIT —</option>
                {tracks.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
            </div>
            {errors.track_id && <p className="mt-1.5 text-red-400 text-xs font-mono flex items-center gap-1"><AlertCircle size={10} />{errors.track_id}</p>}
          </div>
        </div>

        <div>
          <label className="section-label block mb-2">BEST LAP TIME</label>
          <div className="relative">
            <input
              type="text"
              value={formData.lap_time}
              onChange={(e) => handleLapTimeChange(e.target.value)}
              placeholder="1:23.456"
              className={clsx("input-field text-2xl tracking-widest", errors.lap_time && "border-red-500/50", previewTime && !errors.lap_time && "border-neon-green/40")}
            />
            {previewTime && !errors.lap_time && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-neon-green" />
                <span className="text-neon-green text-xs font-mono">VALID</span>
              </div>
            )}
          </div>
          <p className="text-race-dim/60 text-xs font-mono mt-1.5">Format: M:SS.mmm — e.g. 1:23.456</p>
          {errors.lap_time && <p className="mt-1.5 text-red-400 text-xs font-mono flex items-center gap-1"><AlertCircle size={10} />{errors.lap_time}</p>}
        </div>

        {previewTime && (
          <div className="bg-neon-purple-glow border border-neon-purple/20 rounded-lg p-4 text-center">
            <p className="section-label mb-1">LAP TIME PREVIEW</p>
            <p className="lap-time-display text-4xl md:text-5xl">{previewTime}</p>
          </div>
        )}

        <div>
          <label className="section-label block mb-2">NOTES <span className="text-race-dim/40 normal-case tracking-normal font-sans font-normal">(optional)</span></label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Setup notes, fuel load, tyre compound, track conditions..."
            rows={3}
            className="input-field resize-none text-sm font-sans"
          />
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm font-mono">
            <AlertCircle size={14} />{errors.submit}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-bold text-lg tracking-widest py-4 rounded-lg transition-all duration-200"
          style={{ boxShadow: submitting ? "none" : "0 0 30px rgba(184,79,255,0.3), 0 4px 20px rgba(0,0,0,0.4)" }}
        >
          {submitting ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />SUBMITTING...</>
          ) : (
            <><Flag size={20} />POST LAP TIME</>
          )}
        </button>
      </div>
    </div>
  );
}

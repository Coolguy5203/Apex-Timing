"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Car, Track } from "@/types";
import { Filter, ChevronDown, X } from "lucide-react";
import { SearchSelect } from "@/components/ui/SearchSelect";

interface LeaderboardFiltersProps {
  cars: Car[];
  tracks: Track[];
  classes: string[];
  selectedCar?: string;
  selectedTrack?: string;
  selectedClass?: string;
}

export function LeaderboardFilters({ cars, tracks, classes, selectedCar, selectedTrack, selectedClass }: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "class" && value) params.delete("car");
    if (key === "car" && value) params.delete("class");
    router.push(`/leaderboard?${params.toString()}`);
  };

  const clearFilters = () => router.push("/leaderboard");
  const hasFilters = selectedCar || selectedTrack || selectedClass;

  const filteredCars = selectedClass
    ? cars.filter((c) => c.class === selectedClass)
    : cars;

  return (
    <div className="race-card p-5 mb-6 overflow-visible">
      <div className="flex items-center gap-2 mb-4 text-race-dim">
        <Filter size={14} />
        <span className="text-xs font-mono tracking-widest">FILTER</span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-xs font-mono text-race-dim hover:text-red-400 transition-colors px-2 py-1 border border-race-border hover:border-red-400/30 rounded"
          >
            <X size={11} />CLEAR ALL
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Class filter — plain select, only a handful of classes */}
        <div>
          <p className="section-label mb-2">CLASS</p>
          <div className="relative">
            <select
              value={selectedClass || ""}
              onChange={(e) => updateFilter("class", e.target.value)}
              className="w-full appearance-none bg-race-muted border border-race-border rounded px-3 py-[11px] text-sm font-mono text-race-text pr-8 focus:outline-none focus:border-neon-purple transition-colors cursor-pointer"
            >
              <option value="">ALL CLASSES</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
          </div>
        </div>

        {/* Car filter — searchable */}
        <SearchSelect
          label="CAR"
          placeholder="— ALL CARS —"
          options={filteredCars.map((c) => ({ id: c.id, name: c.name, class: c.class }))}
          value={selectedCar || ""}
          onChange={(v) => updateFilter("car", v)}
          groupBy="class"
        />

        {/* Track filter — searchable */}
        <SearchSelect
          label="CIRCUIT"
          placeholder="— ALL CIRCUITS —"
          options={tracks.map((t) => ({ id: t.id, name: t.name, country: (t as any).country }))}
          value={selectedTrack || ""}
          onChange={(v) => updateFilter("track", v)}
          groupBy="country"
        />
      </div>
    </div>
  );
}

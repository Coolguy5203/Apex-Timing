"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Car, Track } from "@/types";
import { Filter, ChevronDown } from "lucide-react";

interface LeaderboardFiltersProps {
  cars: Car[];
  tracks: Track[];
  selectedCar?: string;
  selectedTrack?: string;
}

export function LeaderboardFilters({ cars, tracks, selectedCar, selectedTrack }: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/leaderboard?${params.toString()}`);
  };

  const clearFilters = () => router.push("/leaderboard");
  const hasFilters = selectedCar || selectedTrack;

  return (
    <div className="race-card p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 text-race-dim mr-2">
          <Filter size={14} />
          <span className="text-xs font-mono tracking-widest">FILTER</span>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <select
            value={selectedCar || ""}
            onChange={(e) => updateFilter("car", e.target.value)}
            className="w-full appearance-none bg-race-muted border border-race-border rounded px-3 py-2.5 text-sm font-mono text-race-text pr-8 focus:outline-none focus:border-neon-purple transition-colors cursor-pointer"
          >
            <option value="">ALL CARS</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>{car.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <select
            value={selectedTrack || ""}
            onChange={(e) => updateFilter("track", e.target.value)}
            className="w-full appearance-none bg-race-muted border border-race-border rounded px-3 py-2.5 text-sm font-mono text-race-text pr-8 focus:outline-none focus:border-neon-purple transition-colors cursor-pointer"
          >
            <option value="">ALL TRACKS</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>{track.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-race-dim pointer-events-none" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs font-mono text-race-dim hover:text-red-400 transition-colors whitespace-nowrap px-2 py-1 border border-race-border hover:border-red-400/30 rounded">
            CLEAR ALL
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLapTime } from "@/utils/lapTime";
import { Radio } from "lucide-react";

interface TickerItem {
  driver: string;
  track: string;
  car: string;
  time: string;
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchLatest = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("lap_times")
        .select("lap_time_ms, submitted_at, users(driver_name), cars(name), tracks(name)")
        .order("submitted_at", { ascending: false })
        .limit(10);

      if (data) {
        setItems(data.map((d) => ({
          driver: (d.users as any)?.driver_name || "Unknown",
          track: (d.tracks as any)?.name || "Unknown",
          car: (d.cars as any)?.name || "Unknown",
          time: formatLapTime(d.lap_time_ms),
        })));
      }
    };
    fetchLatest();
  }, []);

  if (items.length === 0) return null;

  const tickerText = items
    .map((item) => `${item.driver.toUpperCase()} — ${item.track.toUpperCase()} — ${item.time}`)
    .join("   ///   ");

  return (
    <div className="bg-neon-purple h-7 flex items-center overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 bg-black/30 h-full border-r border-white/20">
        <Radio size={10} className="text-white animate-pulse" />
        <span className="text-white text-xs font-mono font-bold tracking-widest whitespace-nowrap">LIVE</span>
      </div>
      <div className="ticker-wrapper flex-1">
        <span className="ticker-content text-white text-xs font-mono font-medium tracking-wider opacity-90">
          {tickerText} &nbsp;&nbsp;&nbsp; {tickerText}
        </span>
      </div>
    </div>
  );
}

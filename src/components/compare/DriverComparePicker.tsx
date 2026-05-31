"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Swords } from "lucide-react";

interface DriverComparePickerProps {
  driverNames: string[];
  initialA?: string;
  initialB?: string;
}

function DriverSearch({
  label,
  driverNames,
  value,
  onChange,
  exclude,
}: {
  label: string;
  driverNames: string[];
  value: string;
  onChange: (slug: string) => void;
  exclude?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Decode slug → display name for the selected value
  const selectedName = value
    ? driverNames.find((n) => n.toLowerCase().replace(/\s+/g, "-") === value) ?? value
    : null;

  const filtered = driverNames
    .filter((n) => n.toLowerCase().replace(/\s+/g, "-") !== exclude)
    .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <p className="section-label mb-2">{label}</p>
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-md border text-sm font-mono transition-all text-left
          ${open ? "border-neon-purple ring-1 ring-neon-purple bg-race-muted" : "border-race-border bg-race-muted"}
          ${selectedName ? "text-race-text" : "text-race-dim"}`}
      >
        <span className="truncate">{selectedName ? selectedName.toUpperCase() : "— SELECT DRIVER —"}</span>
        {selectedName && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-race-dim hover:text-red-400 transition-colors p-0.5 flex-shrink-0 ml-2"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-race-card border border-neon-purple/30 rounded-lg shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-2 border-b border-race-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-race-muted rounded border border-race-border focus-within:border-neon-purple transition-colors">
              <Search size={13} className="text-race-dim flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search drivers..."
                className="flex-1 bg-transparent text-race-text text-sm font-mono outline-none placeholder-race-dim/60"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-race-dim text-xs font-mono">NO RESULTS</div>
            ) : filtered.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name.toLowerCase().replace(/\s+/g, "-"));
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full px-4 py-2.5 text-sm font-mono text-left text-race-text hover:bg-race-muted transition-colors"
              >
                {name.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-race-border bg-race-dark">
            <span className="text-race-dim text-xs font-mono">{filtered.length} drivers</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DriverComparePicker({ driverNames, initialA, initialB }: DriverComparePickerProps) {
  const router = useRouter();
  const [slugA, setSlugA] = useState(initialA ?? "");
  const [slugB, setSlugB] = useState(initialB ?? "");

  const handleCompare = () => {
    if (slugA && slugB) {
      router.push(`/compare?a=${slugA}&b=${slugB}`);
    }
  };

  // Auto-navigate when both are set
  useEffect(() => {
    if (slugA && slugB && (slugA !== initialA || slugB !== initialB)) {
      router.push(`/compare?a=${slugA}&b=${slugB}`);
    }
  }, [slugA, slugB]);

  return (
    <div className="race-card p-5 mb-6 overflow-visible">
      <div className="flex flex-col sm:flex-row items-end gap-3">
        <DriverSearch
          label="DRIVER A"
          driverNames={driverNames}
          value={slugA}
          onChange={setSlugA}
          exclude={slugB}
        />
        <div className="flex-shrink-0 pb-1">
          <div className="w-9 h-9 rounded-lg bg-race-muted border border-race-border flex items-center justify-center">
            <Swords size={16} className="text-race-dim" />
          </div>
        </div>
        <DriverSearch
          label="DRIVER B"
          driverNames={driverNames}
          value={slugB}
          onChange={setSlugB}
          exclude={slugA}
        />
      </div>
      {(!slugA || !slugB) && (
        <p className="text-race-dim/50 text-xs font-mono mt-3 text-center">
          Select two drivers to compare their best lap times on every shared combo
        </p>
      )}
    </div>
  );
}

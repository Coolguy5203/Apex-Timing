"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import clsx from "clsx";

interface Option {
  id: string;
  name: string;
  class?: string;
  country?: string;
}

interface SearchSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  error?: string;
  groupBy?: "class" | "country";
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  groupBy,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.class && o.class.toLowerCase().includes(search.toLowerCase())) ||
    (o.country && o.country.toLowerCase().includes(search.toLowerCase()))
  );

  // Group options
  const grouped = groupBy
    ? filtered.reduce((acc, opt) => {
        const key = (opt[groupBy] as string) || "Other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(opt);
        return acc;
      }, {} as Record<string, Option[]>)
    : { "": filtered };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="section-label block mb-2">{label}</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 rounded-md border text-sm font-mono transition-all duration-200 text-left",
          "bg-race-muted border-race-border text-race-text",
          open && "border-neon-purple ring-1 ring-neon-purple",
          error && "border-red-500/50",
          !selected && "text-race-dim"
        )}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span>{selected.name}</span>
              {selected.class && (
                <span className="text-xs text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-1.5 py-0.5 rounded">
                  {selected.class}
                </span>
              )}
              {selected.country && (
                <span className="text-xs text-race-dim">{selected.country}</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-race-dim hover:text-red-400 transition-colors p-0.5 cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={clsx("text-race-dim transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-race-card border border-neon-purple/30 rounded-lg shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-race-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-race-muted rounded border border-race-border focus-within:border-neon-purple transition-colors">
              <Search size={13} className="text-race-dim flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent text-race-text text-sm font-mono outline-none placeholder-race-dim/60"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-race-dim hover:text-race-text">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-race-dim text-xs font-mono">
                NO RESULTS FOR "{search.toUpperCase()}"
              </div>
            ) : (
              Object.entries(grouped).map(([group, opts]) => (
                <div key={group}>
                  {group && (
                    <div className="px-3 py-1.5 text-xs font-mono text-neon-purple/70 tracking-widest bg-race-dark border-b border-race-border/50 sticky top-0">
                      {group.toUpperCase()}
                    </div>
                  )}
                  {opts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { onChange(opt.id); setOpen(false); setSearch(""); }}
                      className={clsx(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm font-mono text-left transition-colors",
                        opt.id === value
                          ? "bg-neon-purple/10 text-neon-purple"
                          : "text-race-text hover:bg-race-muted"
                      )}
                    >
                      <span>{opt.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        {opt.class && !groupBy && (
                          <span className="text-xs text-race-dim">{opt.class}</span>
                        )}
                        {opt.country && !groupBy && (
                          <span className="text-xs text-race-dim">{opt.country}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Count */}
          <div className="px-3 py-1.5 border-t border-race-border bg-race-dark">
            <span className="text-race-dim text-xs font-mono">
              {filtered.length} OF {options.length} SHOWN
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-red-400 text-xs font-mono flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}

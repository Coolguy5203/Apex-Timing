import { createClient } from "@/lib/supabase/server";
import { DriverComparePicker } from "@/components/compare/DriverComparePicker";
import { Swords } from "lucide-react";

async function getCompareData(slugA: string | undefined, slugB: string | undefined) {
  if (!slugA || !slugB) return { driverA: null, driverB: null, combos: [] };

  const supabase = await createClient();

  const nameA = decodeURIComponent(slugA).replace(/-/g, " ");
  const nameB = decodeURIComponent(slugB).replace(/-/g, " ");

  const [{ data: driverA }, { data: driverB }] = await Promise.all([
    supabase.from("users").select("id, driver_name, team_name, team_rank").ilike("driver_name", nameA).single(),
    supabase.from("users").select("id, driver_name, team_name, team_rank").ilike("driver_name", nameB).single(),
  ]);

  if (!driverA || !driverB) return { driverA, driverB, combos: [] };

  // Fetch all laps for both drivers
  const [{ data: lapsA }, { data: lapsB }] = await Promise.all([
    supabase.from("lap_times").select("car_id, track_id, lap_time_ms, lap_time_formatted, cars(name, class), tracks(name, country)").eq("driver_id", driverA.id).neq("validation_status", "flagged"),
    supabase.from("lap_times").select("car_id, track_id, lap_time_ms, lap_time_formatted, cars(name, class), tracks(name, country)").eq("driver_id", driverB.id).neq("validation_status", "flagged"),
  ]);

  // Best per combo for each driver
  const bestA = new Map<string, any>();
  for (const l of lapsA || []) {
    const key = `${l.car_id}|${l.track_id}`;
    if (!bestA.has(key) || l.lap_time_ms < bestA.get(key).lap_time_ms) bestA.set(key, l);
  }
  const bestB = new Map<string, any>();
  for (const l of lapsB || []) {
    const key = `${l.car_id}|${l.track_id}`;
    if (!bestB.has(key) || l.lap_time_ms < bestB.get(key).lap_time_ms) bestB.set(key, l);
  }

  // All unique combos across both drivers
  const allKeys = new Set([...bestA.keys(), ...bestB.keys()]);

  const combos = Array.from(allKeys).map((key) => {
    const a = bestA.get(key) ?? null;
    const b = bestB.get(key) ?? null;
    const ref = a || b;
    const deltaMs = a && b ? a.lap_time_ms - b.lap_time_ms : null;
    return {
      key,
      car: (ref.cars as any),
      track: (ref.tracks as any),
      a: a ? { ms: a.lap_time_ms, fmt: a.lap_time_formatted } : null,
      b: b ? { ms: b.lap_time_ms, fmt: b.lap_time_formatted } : null,
      deltaMs,  // negative = A faster, positive = B faster
      winner: deltaMs === null ? null : deltaMs < 0 ? "a" : deltaMs > 0 ? "b" : "tie",
    };
  }).sort((x, y) => {
    // Shared combos first, then by car+track name
    const xShared = x.a && x.b ? 0 : 1;
    const yShared = y.a && y.b ? 0 : 1;
    if (xShared !== yShared) return xShared - yShared;
    return `${x.car?.name}${x.track?.name}`.localeCompare(`${y.car?.name}${y.track?.name}`);
  });

  // Summary
  let winsA = 0, winsB = 0, ties = 0;
  for (const c of combos) {
    if (c.winner === "a") winsA++;
    else if (c.winner === "b") winsB++;
    else if (c.winner === "tie") ties++;
  }

  return { driverA, driverB, combos, winsA, winsB, ties };
}

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const { driverA, driverB, combos, winsA, winsB, ties } = await getCompareData(params.a, params.b);

  const supabase = await createClient();
  const { data: allDrivers } = await supabase
    .from("users")
    .select("driver_name")
    .order("driver_name");

  const driverNames = (allDrivers || []).map((d) => d.driver_name);
  const sharedCombos = combos.filter((c) => c.a && c.b);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Swords size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">HEAD-TO-HEAD</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">COMPARE DRIVER TIMES ACROSS EVERY COMBO</p>
          </div>
        </div>

        {/* Driver picker */}
        <DriverComparePicker
          driverNames={driverNames}
          initialA={params.a}
          initialB={params.b}
        />

        {/* Results */}
        {driverA && driverB && (
          <>
            {/* Scoreboard */}
            <div className="race-card overflow-hidden mb-6">
              <div className="grid grid-cols-3 divide-x divide-race-border">
                {/* Driver A */}
                <div className={`p-6 text-center ${winsA! > winsB! ? "bg-neon-purple/5" : ""}`}>
                  <div className="w-14 h-14 rounded-xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center mx-auto mb-3">
                    <span className="font-display font-black text-3xl text-neon-purple">
                      {driverA.driver_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-display font-black text-xl text-race-text tracking-wide mb-1">
                    {driverA.driver_name.toUpperCase()}
                  </p>
                  {driverA.team_name && (
                    <p className="text-race-dim text-xs font-mono mb-3">{driverA.team_name.toUpperCase()}</p>
                  )}
                  <p className={`font-display font-black text-5xl ${winsA! > winsB! ? "text-neon-purple" : "text-race-text"}`}>
                    {winsA}
                  </p>
                  <p className="text-race-dim text-xs font-mono mt-1">WINS</p>
                </div>

                {/* VS */}
                <div className="p-6 text-center flex flex-col items-center justify-center">
                  <p className="font-display font-black text-2xl text-race-dim mb-2">VS</p>
                  {sharedCombos.length > 0 && (
                    <>
                      <p className="text-race-dim text-xs font-mono">{sharedCombos.length} SHARED</p>
                      <p className="text-race-dim text-xs font-mono">COMBO{sharedCombos.length !== 1 ? "S" : ""}</p>
                      {ties! > 0 && (
                        <p className="text-race-dim/50 text-xs font-mono mt-1">{ties} TIE{ties !== 1 ? "S" : ""}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Driver B */}
                <div className={`p-6 text-center ${winsB! > winsA! ? "bg-neon-purple/5" : ""}`}>
                  <div className="w-14 h-14 rounded-xl bg-neon-purple-glow border-2 border-neon-purple/30 flex items-center justify-center mx-auto mb-3">
                    <span className="font-display font-black text-3xl text-neon-purple">
                      {driverB.driver_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-display font-black text-xl text-race-text tracking-wide mb-1">
                    {driverB.driver_name.toUpperCase()}
                  </p>
                  {driverB.team_name && (
                    <p className="text-race-dim text-xs font-mono mb-3">{driverB.team_name.toUpperCase()}</p>
                  )}
                  <p className={`font-display font-black text-5xl ${winsB! > winsA! ? "text-neon-purple" : "text-race-text"}`}>
                    {winsB}
                  </p>
                  <p className="text-race-dim text-xs font-mono mt-1">WINS</p>
                </div>
              </div>
            </div>

            {/* Combo table */}
            {combos.length === 0 ? (
              <div className="race-card p-10 text-center">
                <Swords size={32} className="text-race-dim/30 mx-auto mb-3" />
                <p className="font-display font-bold text-race-text tracking-widest mb-1">NO LAPS TO COMPARE</p>
                <p className="text-race-dim text-xs font-mono">Neither driver has submitted any lap times yet.</p>
              </div>
            ) : (
              <div className="race-card overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-race-dark border-b border-race-border text-xs font-mono text-race-dim tracking-widest">
                  <div>CAR / CIRCUIT</div>
                  <div className="w-24 text-center">{driverA.driver_name.toUpperCase().split(" ")[0]}</div>
                  <div className="w-16 text-center">DELTA</div>
                  <div className="w-24 text-center">{driverB.driver_name.toUpperCase().split(" ")[0]}</div>
                </div>

                {combos.map((combo) => {
                  const isShared = combo.a && combo.b;
                  const aWins = combo.winner === "a";
                  const bWins = combo.winner === "b";

                  return (
                    <div
                      key={combo.key}
                      className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-race-border/50 last:border-0 items-center ${!isShared ? "opacity-50" : "hover:bg-race-muted/20"} transition-colors`}
                    >
                      {/* Car / Track */}
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-race-text text-sm truncate">{combo.car?.name}</p>
                        <p className="text-race-dim text-xs font-mono truncate">{combo.track?.name}</p>
                        {!isShared && (
                          <p className="text-race-dim/40 text-[10px] font-mono">
                            {combo.a ? `Only ${driverA.driver_name}` : `Only ${driverB.driver_name}`}
                          </p>
                        )}
                      </div>

                      {/* Driver A time */}
                      <div className="w-24 text-center">
                        {combo.a ? (
                          <span className={`font-mono font-bold text-sm ${aWins ? "text-neon-green" : "text-race-text"}`}>
                            {aWins && "⚡ "}{combo.a.fmt}
                          </span>
                        ) : (
                          <span className="text-race-dim/30 font-mono text-xs">—</span>
                        )}
                      </div>

                      {/* Delta */}
                      <div className="w-16 text-center">
                        {combo.deltaMs === null ? (
                          <span className="text-race-dim/30 text-xs font-mono">—</span>
                        ) : combo.deltaMs === 0 ? (
                          <span className="text-race-dim text-xs font-mono">TIED</span>
                        ) : (
                          <span className={`text-xs font-mono font-bold ${combo.deltaMs < 0 ? "text-neon-green" : "text-red-400"}`}>
                            {combo.deltaMs < 0 ? "-" : "+"}{(Math.abs(combo.deltaMs) / 1000).toFixed(3)}s
                          </span>
                        )}
                      </div>

                      {/* Driver B time */}
                      <div className="w-24 text-center">
                        {combo.b ? (
                          <span className={`font-mono font-bold text-sm ${bWins ? "text-neon-green" : "text-race-text"}`}>
                            {bWins && "⚡ "}{combo.b.fmt}
                          </span>
                        ) : (
                          <span className="text-race-dim/30 font-mono text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

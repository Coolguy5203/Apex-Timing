import { createClient } from "@/lib/supabase/server";
import { Car, Zap, Lock } from "lucide-react";
import Link from "next/link";

export default async function CarsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isPro = user ? (await supabase.from("users").select("is_pro").eq("id", user.id).single()).data?.is_pro : false;

  // All cars with lap counts
  const { data: cars } = await supabase
    .from("cars")
    .select("id, name, class, is_pro")
    .order("class")
    .order("name");

  const { data: lapStats } = await supabase
    .from("lap_times")
    .select("car_id, driver_id")
    .neq("validation_status", "flagged");

  const lapsByCar    = new Map<string, number>();
  const driversByCar = new Map<string, Set<string>>();
  for (const l of lapStats ?? []) {
    lapsByCar.set(l.car_id, (lapsByCar.get(l.car_id) ?? 0) + 1);
    if (!driversByCar.has(l.car_id)) driversByCar.set(l.car_id, new Set());
    driversByCar.get(l.car_id)!.add(l.driver_id);
  }

  // Group by class
  type CarRow = NonNullable<typeof cars>[number];
  const byClass = new Map<string, CarRow[]>();
  for (const car of cars ?? []) {
    if (!byClass.has(car.class)) byClass.set(car.class, []);
    byClass.get(car.class)!.push(car);
  }
  const classes = Array.from(byClass.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Car size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-4xl text-race-text tracking-wider">CARS</h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">
              {cars?.length ?? 0} CARS ACROSS {classes.length} CLASSES · CLICK FOR TECHNICAL X-RAY
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {classes.map(([cls, carsInClass]) => (
            <div key={cls}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono font-bold text-neon-purple tracking-widest">{cls.toUpperCase()}</span>
                <div className="flex-1 h-px bg-race-border" />
                <span className="text-race-dim/50 text-[10px] font-mono">{carsInClass.length} CARS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {carsInClass.map((car) => {
                  const laps    = lapsByCar.get(car.id) ?? 0;
                  const drivers = driversByCar.get(car.id)?.size ?? 0;
                  const locked  = car.is_pro && !isPro;
                  const slug    = car.name.toLowerCase().replace(/\s+/g, "-");

                  return (
                    <Link
                      key={car.id}
                      href={locked ? "/pro" : `/cars/${encodeURIComponent(slug)}`}
                      className={`race-card p-4 flex items-center gap-4 transition-all group ${
                        locked
                          ? "opacity-50 cursor-default"
                          : "hover:border-neon-purple/30 hover:bg-race-muted/10"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-neon-purple-glow border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                        {locked
                          ? <Lock size={14} className="text-race-dim" />
                          : <Car size={14} className="text-neon-purple group-hover:scale-110 transition-transform" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-race-text text-sm tracking-wide truncate group-hover:text-neon-purple transition-colors">
                          {car.name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {laps > 0 ? (
                            <>
                              <span className="text-race-dim text-[10px] font-mono">{laps} LAPS</span>
                              <span className="text-race-dim/50 text-[10px] font-mono">{drivers} DRIVERS</span>
                            </>
                          ) : (
                            <span className="text-race-dim/40 text-[10px] font-mono">NO LAPS YET</span>
                          )}
                        </div>
                      </div>
                      {car.is_pro && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex-shrink-0">PRO</span>
                      )}
                      {laps > 0 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-display font-black text-neon-purple">{laps}</div>
                          <div className="text-[9px] font-mono text-race-dim">LAPS</div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

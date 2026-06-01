import { Suspense } from "react";
import { getLeaderboard, getCars, getTracks, getCarClasses } from "@/lib/supabase/queries";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardFilters } from "@/components/leaderboard/LeaderboardFilters";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface LeaderboardPageProps {
  searchParams: Promise<{ car?: string; track?: string; class?: string }>;
}

async function LeaderboardContent({ carId, trackId, carClass, currentUserId }: { carId?: string; trackId?: string; carClass?: string; currentUserId?: string }) {
  const [entries, cars, tracks, classes] = await Promise.all([
    getLeaderboard(carId, trackId, carClass),
    getCars(),
    getTracks(),
    getCarClasses(),
  ]);

  const selectedCar = cars.find((c) => c.id === carId);
  const selectedTrack = tracks.find((t) => t.id === trackId);

  return (
    <div>
      <Suspense fallback={null}>
        <LeaderboardFilters cars={cars} tracks={tracks} classes={classes} selectedCar={carId} selectedTrack={trackId} selectedClass={carClass} />
      </Suspense>

      {(selectedCar || selectedTrack || carClass) && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {carClass && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple-glow border border-neon-purple/20 rounded-full">
              <span className="text-neon-purple text-xs font-mono">CLASS</span>
              <span className="text-race-text text-xs font-mono font-bold">{carClass}</span>
            </div>
          )}
          {selectedCar && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple-glow border border-neon-purple/20 rounded-full">
              <span className="text-neon-purple text-xs font-mono">CAR</span>
              <span className="text-race-text text-xs font-mono font-bold">{selectedCar.name}</span>
            </div>
          )}
          {selectedTrack && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple-glow border border-neon-purple/20 rounded-full">
              <span className="text-neon-purple text-xs font-mono">CIRCUIT</span>
              <span className="text-race-text text-xs font-mono font-bold">{selectedTrack.name}</span>
            </div>
          )}
          <div className="px-3 py-1.5 bg-race-muted border border-race-border rounded-full">
            <span className="text-race-dim text-xs font-mono">{entries.length} RESULT{entries.length !== 1 ? "S" : ""}</span>
          </div>
        </div>
      )}

      <div className="race-card overflow-hidden">
        {entries.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-b border-race-border bg-race-dark">
            <div className="flex items-center gap-1.5 text-neon-purple text-xs font-mono">
              <Zap size={10} />FASTEST LAP (PURPLE)
            </div>
            <div className="flex items-center gap-1.5 text-neon-green text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-neon-green inline-block" />P1 GAP
            </div>
          </div>
        )}
        <LeaderboardTable entries={entries} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const carId = params.car;
  const trackId = params.track;
  const carClass = params.class;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">LEADERBOARD</h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">FASTEST LAP TIMES BY CAR & CIRCUIT COMBINATION</p>
            </div>
          </div>
        </div>
        <Suspense fallback={<PageLoader />}>
          <LeaderboardContent carId={carId} trackId={trackId} carClass={carClass} currentUserId={user?.id} />
        </Suspense>
      </div>
    </div>
  );
}

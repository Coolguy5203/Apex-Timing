import { Clock, Car, MapPin } from "lucide-react";
import { formatRelativeTime } from "@/utils/lapTime";
import { Badge } from "@/components/ui/Badge";

interface Submission {
  id: string;
  driver_name: string;
  team_name?: string;
  car_name: string;
  track_name: string;
  lap_time_formatted: string;
  lap_time_ms: number;
  submitted_at: string;
}

interface LatestSubmissionsProps {
  submissions: Submission[];
}

export function LatestSubmissions({ submissions }: LatestSubmissionsProps) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-race-dim text-4xl mb-4">🏎️</div>
        <p className="text-race-dim font-mono text-sm">NO SUBMISSIONS YET</p>
        <p className="text-race-dim/60 font-mono text-xs mt-1">Be the first to post a lap time</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((sub, index) => (
        <div
          key={sub.id}
          className="leaderboard-row race-card p-4"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-race-text tracking-wide text-sm truncate">
                    {sub.driver_name.toUpperCase()}
                  </span>
                  {sub.team_name && (
                    <Badge variant="muted" size="sm">{sub.team_name.toUpperCase()}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-race-dim text-xs font-mono">
                    <Car size={10} />{sub.car_name}
                  </span>
                  <span className="flex items-center gap-1 text-race-dim text-xs font-mono">
                    <MapPin size={10} />{sub.track_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="lap-time-display text-lg md:text-xl">{sub.lap_time_formatted}</span>
              <div className="hidden sm:flex items-center gap-1 text-race-dim text-xs font-mono min-w-[70px] justify-end">
                <Clock size={10} />{formatRelativeTime(sub.submitted_at)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

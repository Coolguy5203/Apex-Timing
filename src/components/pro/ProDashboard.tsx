import { Zap, Star, Car, MapPin, BarChart2, Shield, Trophy, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/utils/lapTime";

interface ProDashboardProps {
  profile: {
    driver_name: string;
    team_name?: string;
    is_pro: boolean;
    pro_code_used?: string;
    pro_since?: string;
  };
}

const PRO_PERKS = [
  {
    icon: Car,
    title: "200+ Cars Unlocked",
    description: "Every iRacing car available in the submit form including all GT3, GTP, LMP, Formula, and NASCAR classes",
    status: "ACTIVE",
  },
  {
    icon: MapPin,
    title: "150+ Tracks Unlocked",
    description: "Every circuit, oval, and street course in iRacing available for lap time submissions",
    status: "ACTIVE",
  },
  {
    icon: BarChart2,
    title: "Basic Telemetry",
    description: "Sector time breakdowns, speed traces, and lap delta charts — coming soon",
    status: "COMING SOON",
  },
  {
    icon: Trophy,
    title: "PRO Leaderboard",
    description: "Separate verified PRO-only leaderboard with enhanced filtering — coming soon",
    status: "COMING SOON",
  },
  {
    icon: Star,
    title: "PRO Badge",
    description: "Your gold PRO badge is shown on leaderboards and your team page",
    status: "ACTIVE",
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Direct access to the APEX TIMING team for help and feature requests",
    status: "ACTIVE",
  },
];

export function ProDashboard({ profile }: ProDashboardProps) {
  return (
    <div>
      {/* PRO Header */}
      <div className="relative race-card p-8 mb-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[80px]" style={{ background: "rgba(255,215,0,0.04)" }} />
        </div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)" }}>
              <Zap size={30} style={{ color: "#ffd700" }} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display font-black text-3xl text-race-text tracking-wider">
                  {profile.driver_name.toUpperCase()}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700" }}>
                  <Star size={10} />PRO
                </span>
              </div>
              <p className="text-race-dim text-xs font-mono tracking-widest">APEX TIMING PRO MEMBER</p>
              {profile.team_name && (
                <p className="text-race-dim text-xs font-mono mt-1">{profile.team_name.toUpperCase()}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-right">
            {profile.pro_since && (
              <div className="flex items-center gap-2 text-race-dim text-xs font-mono">
                <Calendar size={11} />
                PRO SINCE {new Date(profile.pro_since).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
              </div>
            )}
            {profile.pro_code_used && (
              <div className="flex items-center gap-2 text-race-dim text-xs font-mono">
                <Zap size={11} style={{ color: "#ffd700" }} />
                CODE: {profile.pro_code_used}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRO Perks */}
      <h2 className="font-display font-bold text-xl text-race-text tracking-wider mb-4">YOUR PRO FEATURES</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {PRO_PERKS.map((perk) => (
          <div
            key={perk.title}
            className="race-card p-5 flex items-start gap-4"
            style={perk.status === "ACTIVE" ? { borderColor: "rgba(255,215,0,0.15)" } : {}}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={perk.status === "ACTIVE"
                ? { background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)" }
                : { background: "rgba(107,107,126,0.1)", border: "1px solid rgba(107,107,126,0.2)" }
              }
            >
              <perk.icon size={18} style={{ color: perk.status === "ACTIVE" ? "#ffd700" : "#6b6b7e" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono font-bold text-sm text-race-text">{perk.title}</p>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  perk.status === "ACTIVE"
                    ? "text-neon-green bg-neon-green/10 border border-neon-green/20"
                    : "text-race-dim bg-race-muted border border-race-border"
                }`}>
                  {perk.status}
                </span>
              </div>
              <p className="text-race-dim text-xs leading-relaxed">{perk.description}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-race-dim/40 text-xs font-mono text-center">
        MORE PRO FEATURES COMING SOON · THANK YOU FOR SUPPORTING APEX TIMING
      </p>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCars, getTracks } from "@/lib/supabase/queries";
import { SubmitLapForm } from "@/components/forms/SubmitLapForm";
import { Flag, Info } from "lucide-react";

export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      driver_name: user.user_metadata?.driver_name || user.email?.split("@")[0] || "Driver",
      team_name: user.user_metadata?.team_name || null,
    });
  }

 const isPro = profile?.is_pro ?? false;
const [cars, tracks] = await Promise.all([getCars(isPro), getTracks(isPro)]);

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
              <Flag size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-display font-black text-4xl text-race-text tracking-wider">POST LAP TIME</h1>
              <p className="text-race-dim font-mono text-xs tracking-widest">SUBMIT YOUR BEST PRACTICE LAP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-race-card border border-race-border rounded-lg">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-race-dim text-xs font-mono">POSTING AS: </span>
            <span className="text-race-text text-xs font-mono font-bold">
              {(profile?.driver_name || user.email?.split("@")[0] || "DRIVER").toUpperCase()}
            </span>
            {profile?.team_name && (
              <span className="text-race-dim text-xs font-mono">· {profile.team_name}</span>
            )}
          </div>
        </div>

        <SubmitLapForm
          cars={cars}
          tracks={tracks}
          userId={user.id}
          driverName={profile?.driver_name ?? user.email?.split("@")[0] ?? "Driver"}
          teamName={profile?.team_name ?? undefined}
        />

        <div className="mt-6 p-4 bg-race-card border border-race-border rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-neon-purple flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-race-dim text-xs font-mono mb-2">SUBMISSION GUIDELINES</p>
              <ul className="text-race-dim/70 text-xs font-mono space-y-1">
                <li>• Only submit your personal best lap from clean laps</li>
                <li>• Lap times must be from official iRacing practice sessions</li>
                <li>• Enter time in M:SS.mmm format (e.g. 1:32.847)</li>
                <li>• You may submit multiple laps — only your fastest counts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

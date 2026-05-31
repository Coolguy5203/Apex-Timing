import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { AdminTools } from "@/components/settings/AdminTools";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neon-purple-glow border border-neon-purple/30 rounded-lg flex items-center justify-center">
            <Settings size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-display font-black text-3xl text-race-text tracking-wider">
              PROFILE SETTINGS
            </h1>
            <p className="text-race-dim font-mono text-xs tracking-widest">MANAGE YOUR ACCOUNT</p>
          </div>
        </div>
        <ProfileSettings
          userId={user.id}
          currentDriverName={profile?.driver_name || ""}
          email={user.email || ""}
          isPro={profile?.is_pro || false}
          teamName={profile?.team_name || null}
        />
        {profile?.is_admin && (
          <div className="mt-6">
            <AdminTools currentTeamRank={profile?.team_rank ?? 0} />
          </div>
        )}
      </div>
    </div>
  );
}

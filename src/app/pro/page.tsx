import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProUpgrade } from "@/components/pro/ProUpgrade";
import { ProDashboard } from "@/components/pro/ProDashboard";

export default async function ProPage() {
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {profile?.is_pro ? (
          <ProDashboard profile={profile} />
        ) : (
          <ProUpgrade />
        )}
      </div>
    </div>
  );
}

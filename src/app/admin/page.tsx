import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const [usersRes, lapsRes, codesRes] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("lap_times").select(`
      id, lap_time_formatted, submitted_at, driver_id,
      users(driver_name, email),
      cars(name),
      tracks(name)
    `).order("submitted_at", { ascending: false }),
    supabase.from("pro_codes").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminDashboard
      currentUser={profile}
      users={usersRes.data || []}
      lapTimes={lapsRes.data || []}
      proCodes={codesRes.data || []}
    />
  );
}

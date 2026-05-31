import { createClient } from "@/lib/supabase/server";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });
  await checkAndAwardAchievements(user.id);
  return NextResponse.json({ ok: true });
}

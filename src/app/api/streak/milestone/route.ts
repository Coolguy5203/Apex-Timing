import { createClient } from "@/lib/supabase/server";
import { checkAndAwardStreakMilestone } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  await checkAndAwardStreakMilestone(user.id);
  return NextResponse.json({ ok: true });
}

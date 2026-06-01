import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE /api/laps/[id] — driver deletes their own lap
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: lap } = await supabase
    .from("lap_times")
    .select("id, driver_id, validation_status")
    .eq("id", id)
    .maybeSingle();

  if (!lap) return NextResponse.json({ error: "Lap not found" }, { status: 404 });
  if (lap.driver_id !== user.id) return NextResponse.json({ error: "Not your lap" }, { status: 403 });

  const { error } = await supabase.from("lap_times").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

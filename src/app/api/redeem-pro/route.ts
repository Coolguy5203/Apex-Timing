import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const supabase = await createClient();

    // Check user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    // Check if already PRO
    const { data: profile } = await supabase
      .from("users")
      .select("is_pro, pro_code_used")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      return NextResponse.json({ error: "You are already PRO!" }, { status: 400 });
    }

    // Find the code
    const { data: proCode } = await supabase
      .from("pro_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (!proCode) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Check max uses
    if (proCode.max_uses !== null && proCode.use_count >= proCode.max_uses) {
      return NextResponse.json({ error: "This code has reached its maximum uses" }, { status: 400 });
    }

    // Activate PRO for user
    await supabase.from("users").update({
      is_pro: true,
      pro_code_used: code.toUpperCase().trim(),
      pro_since: new Date().toISOString(),
    }).eq("id", user.id);

    // Increment use count
    await supabase.from("pro_codes").update({
      use_count: proCode.use_count + 1,
    }).eq("id", proCode.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

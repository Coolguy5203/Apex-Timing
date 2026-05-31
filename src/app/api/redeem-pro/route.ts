import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { code, device_id } = await req.json();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

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
      return NextResponse.json({ error: "This code has already been used" }, { status: 400 });
    }

    // If this code was issued to a specific user, enforce it
    if (proCode.for_user_id && proCode.for_user_id !== user.id) {
      return NextResponse.json({ error: "This code was issued to a different driver" }, { status: 403 });
    }

    // Device-lock: if a fingerprint is already stored, must match
    if (proCode.device_fingerprint && device_id && proCode.device_fingerprint !== device_id) {
      return NextResponse.json({ error: "This code can only be redeemed on the device it was first used on" }, { status: 403 });
    }

    // Activate PRO
    await supabase.from("users").update({
      is_pro: true,
      pro_code_used: code.toUpperCase().trim(),
      pro_since: new Date().toISOString(),
    }).eq("id", user.id);

    // Mark code used + store device fingerprint if provided
    await supabase.from("pro_codes").update({
      use_count: proCode.use_count + 1,
      ...(device_id && !proCode.device_fingerprint ? { device_fingerprint: device_id } : {}),
    }).eq("id", proCode.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/utils/lapTime";
import { NextResponse } from "next/server";
import { Resend } from "resend";

// POST /api/notifications/email
// Called after a lap is submitted. Emails any driver whose best time was just beaten.
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: true }); // silently skip if not configured

  try {
    const { driver_id, car_id, track_id, lap_time_ms, driver_name, car_name, track_name } = await req.json();
    if (!driver_id || !car_id || !track_id || !lap_time_ms) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createClient();

    // Find all OTHER drivers who have laps on this combo that are SLOWER than the new time
    // (meaning the new lap just beat their time)
    const { data: beatenLaps } = await supabase
      .from("lap_times")
      .select("driver_id, lap_time_ms, users(driver_name, email)")
      .eq("car_id", car_id)
      .eq("track_id", track_id)
      .neq("driver_id", driver_id)
      .gt("lap_time_ms", lap_time_ms);

    if (!beatenLaps || beatenLaps.length === 0) return NextResponse.json({ ok: true });

    // De-duplicate: only notify each driver once (their best lap comparison)
    const bestPerDriver = new Map<string, { driverId: string; email: string; driverName: string; lapMs: number }>();
    for (const lap of beatenLaps) {
      const u = lap.users as any;
      if (!u?.email) continue;
      const existing = bestPerDriver.get(lap.driver_id);
      if (!existing || lap.lap_time_ms < existing.lapMs) {
        bestPerDriver.set(lap.driver_id, {
          driverId: lap.driver_id,
          email: u.email,
          driverName: u.driver_name,
          lapMs: lap.lap_time_ms,
        });
      }
    }

    if (bestPerDriver.size === 0) return NextResponse.json({ ok: true });

    // Create in-app notifications for beaten drivers
    const delta = (ms: number) => `+${((ms - lap_time_ms) / 1000).toFixed(3)}s`;
    await supabase.from("notifications").insert(
      Array.from(bestPerDriver.values()).map(({ driverId, driverName, lapMs }) => ({
        user_id: driverId,
        type: "LAP_BEATEN",
        title: `Your lap at ${track_name} was beaten`,
        message: `${driver_name} posted ${formatLapTime(lap_time_ms)} on the ${car_name} — ${delta(lapMs)} faster than you`,
        data: { car_name, track_name, new_time_ms: lap_time_ms, your_time_ms: lapMs },
      }))
    );

    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "APEX TIMING <notifications@apextiming.racing>";

    await Promise.allSettled(
      Array.from(bestPerDriver.values()).map(({ email, driverName, lapMs }) =>
        resend.emails.send({
          from: fromAddress,
          to: email,
          subject: `⚡ Your lap on ${track_name} was beaten`,
          html: `
            <div style="font-family: monospace; background: #0a0a0f; color: #e2e8f0; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e1e2e;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px;">🏁</span>
                <h1 style="color: #b84fff; letter-spacing: 4px; font-size: 18px; margin: 8px 0 0;">APEX TIMING</h1>
              </div>
              <h2 style="color: #e2e8f0; font-size: 16px; letter-spacing: 2px; margin-bottom: 16px;">YOUR LAP WAS BEATEN</h2>
              <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">
                Hey <strong style="color: #e2e8f0;">${driverName}</strong>, <strong style="color: #b84fff;">${driver_name}</strong> just posted a faster time than yours on <strong style="color: #e2e8f0;">${track_name}</strong>.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 12px; background: #12121a; border: 1px solid #1e1e2e; color: #94a3b8; font-size: 11px; letter-spacing: 2px;">CAR</td>
                  <td style="padding: 10px 12px; background: #12121a; border: 1px solid #1e1e2e; color: #e2e8f0; font-size: 13px;">${car_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; background: #0f0f18; border: 1px solid #1e1e2e; color: #94a3b8; font-size: 11px; letter-spacing: 2px;">NEW TIME</td>
                  <td style="padding: 10px 12px; background: #0f0f18; border: 1px solid #1e1e2e; color: #b84fff; font-size: 16px; font-weight: bold;">${formatLapTime(lap_time_ms)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; background: #12121a; border: 1px solid #1e1e2e; color: #94a3b8; font-size: 11px; letter-spacing: 2px;">YOUR TIME</td>
                  <td style="padding: 10px 12px; background: #12121a; border: 1px solid #1e1e2e; color: #e2e8f0; font-size: 16px; font-weight: bold;">${formatLapTime(lapMs)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; background: #0f0f18; border: 1px solid #1e1e2e; color: #94a3b8; font-size: 11px; letter-spacing: 2px;">DELTA</td>
                  <td style="padding: 10px 12px; background: #0f0f18; border: 1px solid #1e1e2e; color: #4ade80; font-size: 13px;">+${((lapMs - lap_time_ms) / 1000).toFixed(3)}s</td>
                </tr>
              </table>
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://apex-timing-v2.vercel.app"}/leaderboard" style="display: inline-block; background: #b84fff; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: bold;">VIEW LEADERBOARD</a>
              </div>
              <p style="color: #4a5568; font-size: 11px; text-align: center; margin-top: 24px; letter-spacing: 1px;">APEX TIMING · IRACING LAP TRACKER</p>
            </div>
          `,
        })
      )
    );
  } catch (_) {}

  return NextResponse.json({ ok: true });
}

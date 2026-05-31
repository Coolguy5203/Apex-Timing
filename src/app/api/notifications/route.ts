import { NextResponse } from "next/server";

// Discord webhook notification (existing feature)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return NextResponse.json({ ok: true });

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "🏁 New Lap Time Posted",
          color: 0xb84fff,
          fields: [
            { name: "Driver", value: body.driver_name || "Unknown", inline: true },
            { name: "Team", value: body.team_name || "—", inline: true },
            { name: "Time", value: body.lap_time || "—", inline: true },
            { name: "Car", value: body.car_name || "—", inline: true },
            { name: "Track", value: body.track_name || "—", inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (_) {}

  return NextResponse.json({ ok: true });
}

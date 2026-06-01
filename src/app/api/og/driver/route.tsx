import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/utils/lapTime";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";

  // Fetch driver data
  let driverName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let teamName = "";
  let bestTime = "";
  let totalLaps = 0;

  try {
    const supabase = await createClient();

    const { data: driver } = await supabase
      .from("users")
      .select("driver_name, team_name")
      .or(`driver_slug.eq.${slug},driver_name.ilike.${slug.replace(/-/g, " ")}`)
      .maybeSingle();

    if (driver) {
      driverName = driver.driver_name;
      teamName = driver.team_name ?? "";
    }

    const { data: lapData, count } = await supabase
      .from("lap_times")
      .select("lap_time_ms", { count: "exact" })
      .ilike("users.driver_name", driverName)
      .neq("validation_status", "flagged")
      .order("lap_time_ms", { ascending: true })
      .limit(1);

    totalLaps = count ?? 0;
    if (lapData?.[0]) bestTime = formatLapTime(lapData[0].lap_time_ms);
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0b 0%, #12111a 50%, #0e0b18 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)",
          width: "800px", height: "400px",
          background: "radial-gradient(ellipse, rgba(184,79,255,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {/* Top label */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "4px", height: "24px", background: "#b84fff", borderRadius: "2px" }} />
          <span style={{ color: "#b84fff", fontSize: "18px", fontWeight: "bold", letterSpacing: "6px" }}>
            APEX TIMING
          </span>
        </div>

        {/* Driver name */}
        <div style={{ fontSize: "80px", fontWeight: "900", color: "#f8f9fa", letterSpacing: "4px", lineHeight: 1, marginBottom: "16px" }}>
          {driverName.toUpperCase()}
        </div>

        {/* Team */}
        {teamName && (
          <div style={{ fontSize: "24px", color: "#6b7280", letterSpacing: "4px", marginBottom: "40px", fontWeight: "600" }}>
            {teamName.toUpperCase()}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: "40px", marginTop: "auto" }}>
          {bestTime && (
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280", letterSpacing: "4px", marginBottom: "4px" }}>BEST LAP</div>
              <div style={{ fontSize: "36px", fontWeight: "800", color: "#b84fff" }}>{bestTime}</div>
            </div>
          )}
          {totalLaps > 0 && (
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280", letterSpacing: "4px", marginBottom: "4px" }}>TOTAL LAPS</div>
              <div style={{ fontSize: "36px", fontWeight: "800", color: "#f8f9fa" }}>{totalLaps}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "APEX TIMING | iRacing Lap Tracker",
  description: "Professional lap time tracking and leaderboards for iRacing teams",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "APEX TIMING | iRacing Lap Tracker",
    description: "Track lap times and dominate the leaderboard with your iRacing team",
    images: ["/og-image.svg"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "APEX TIMING",
    "theme-color": "#b84fff",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let isPro = false;
  let driverSlug: string | undefined;
  let lapCount: number | undefined;
  if (user) {
    const [profileRes, lapCountRes] = await Promise.all([
      supabase.from("users").select("is_admin, is_pro, driver_name, driver_slug").eq("id", user.id).single(),
      supabase.from("lap_times").select("id", { count: "exact", head: true }).eq("driver_id", user.id),
    ]);
    isAdmin = profileRes.data?.is_admin ?? false;
    isPro = profileRes.data?.is_pro ?? false;
    // Use stable driver_slug if set, otherwise fall back to name-derived slug
    if (profileRes.data?.driver_slug) {
      driverSlug = profileRes.data.driver_slug;
    } else if (profileRes.data?.driver_name) {
      driverSlug = profileRes.data.driver_name.toLowerCase().replace(/\s+/g, "-");
    }
    lapCount = lapCountRes.count ?? 0;
  }

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-race-black antialiased">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-purple-glow rounded-full blur-[120px] opacity-20" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-neon-green-glow rounded-full blur-[100px] opacity-10" />
        </div>
        <div className="relative z-10">
          <LiveTicker />
          <Navbar isAdmin={isAdmin} isPro={isPro} driverSlug={driverSlug} lapCount={lapCount} />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t border-race-border mt-20 py-8 px-6">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-neon-purple font-display text-xl font-bold tracking-wider">
                    APEX TIMING
                  </span>
                  <span className="text-race-dim text-xs font-mono">v1.0.0</span>
                </div>
                <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                  {[
                    { href: "/leaderboard", label: "LEADERBOARD" },
                    { href: "/records", label: "RECORDS" },
                    { href: "/championship", label: "CHAMPIONSHIP" },
                    { href: "/teams", label: "TEAMS" },
                    { href: "/search", label: "SEARCH" },
                    { href: "/submit", label: "SUBMIT LAP" },
                  ].map(({ href, label }) => (
                    <a key={href} href={href} className="text-race-dim hover:text-race-text text-xs font-mono tracking-wider transition-colors">
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
              <p className="text-race-dim/50 text-xs font-mono text-center">
                © 2025 APEX TIMING. FOR IRACING USE ONLY. NOT AFFILIATED WITH iRACING.COM
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

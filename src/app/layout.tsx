import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { LiveTicker } from "@/components/layout/LiveTicker";

export const metadata: Metadata = {
  title: "APEX TIMING | iRacing Lap Tracker",
  description: "Professional lap time tracking and leaderboards for iRacing teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-race-black antialiased">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-purple-glow rounded-full blur-[120px] opacity-20" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-neon-green-glow rounded-full blur-[100px] opacity-10" />
        </div>
        <div className="relative z-10">
          <LiveTicker />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t border-race-border mt-20 py-8 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-neon-purple font-display text-xl font-bold tracking-wider">
                  APEX TIMING
                </span>
                <span className="text-race-dim text-xs font-mono">v1.0.0</span>
              </div>
              <p className="text-race-dim text-xs font-mono">
                © 2025 APEX TIMING. FOR IRACING USE ONLY. NOT AFFILIATED WITH iRACING.COM
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Timer, Trophy, Flag, LogIn, LogOut, Menu, X, User, Users, Zap, Shield } from "lucide-react";
import clsx from "clsx";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    setMobileOpen(false);
  };

const navLinks = [
    { href: "/", label: "DASHBOARD", icon: Timer },
    { href: "/leaderboard", label: "LEADERBOARD", icon: Trophy },
    { href: "/team", label: "TEAM", icon: Users },
    { href: "/submit", label: "SUBMIT LAP", icon: Flag },
    { href: "/pro", label: "⚡ PRO", icon: Zap },
  ];

  return (
    <nav className={clsx("sticky top-0 z-50 transition-all duration-300", scrolled ? "glass border-b border-race-border shadow-lg shadow-black/20" : "bg-race-black/80 border-b border-race-border/50")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-8 h-8 bg-neon-purple rounded-sm flex items-center justify-center">
                <span className="text-white font-display font-black text-sm">A</span>
              </div>
              <div className="absolute inset-0 bg-neon-purple rounded-sm blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            </div>
            <span className="font-display font-bold text-xl text-race-text tracking-widest">
              APEX <span className="text-neon-purple">TIMING</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={clsx("flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-medium tracking-widest transition-all duration-200", pathname === href ? "text-neon-purple bg-neon-purple-glow border border-neon-purple/30" : "text-race-dim hover:text-race-text hover:bg-race-muted")}>
                <Icon size={14} />{label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-race-card border border-race-border rounded text-xs font-mono text-race-dim">
                  <User size={12} className="text-neon-purple" />
                  <span className="text-race-text max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                </div>
                {user.user_metadata?.is_admin && (
                  <Link href="/admin" className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 rounded transition-all">
                    <Shield size={12} />ADMIN
                  </Link>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-race-dim hover:text-red-400 transition-colors border border-race-border hover:border-red-400/30 rounded">
                  <LogOut size={12} />SIGN OUT
                </button>
              </div>
            ) : (
              <Link href="/auth" className="flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-medium tracking-widest rounded transition-all duration-200" style={{ boxShadow: "0 0 20px rgba(184,79,255,0.3)" }}>
                <LogIn size={14} />SIGN IN
              </Link>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-race-dim hover:text-race-text p-2">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-race-border py-4 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={clsx("flex items-center gap-3 px-4 py-3 rounded text-sm font-mono tracking-wider transition-all", pathname === href ? "text-neon-purple bg-neon-purple-glow" : "text-race-dim hover:text-race-text hover:bg-race-muted")}>
                <Icon size={16} />{label}
              </Link>
            ))}
            <div className="pt-3 border-t border-race-border mt-3">
              {user ? (
                <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 w-full text-sm font-mono text-red-400">
                  <LogOut size={16} />SIGN OUT
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-neon-purple">
                  <LogIn size={16} />SIGN IN / REGISTER
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

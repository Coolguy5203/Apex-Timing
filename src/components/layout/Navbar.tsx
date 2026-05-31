"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy, Flag, LogIn, LogOut, Menu, X, User, Users,
  Zap, Shield, Star, Settings, Target, Swords, Medal, ChevronDown
} from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import clsx from "clsx";

interface NavbarProps {
  isAdmin?: boolean;
  isPro?: boolean;
}

const navLinks = [
  { href: "/leaderboard",   label: "TIMES",      icon: Trophy  },
  { href: "/rankings",      label: "RANKINGS",   icon: Medal   },
  { href: "/h2h",           label: "H2H",        icon: Swords  },
  { href: "/championship",  label: "CHAMP",      icon: Star    },
  { href: "/teams",         label: "TEAMS",      icon: Users   },
  { href: "/challenges",    label: "CHALLENGES", icon: Target  },
  { href: "/submit",        label: "SUBMIT",     icon: Flag    },
];

export function Navbar({ isAdmin = false, isPro = false }: NavbarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    try { await createClient().auth.signOut(); } catch (_) {}
    window.location.href = "/";
  };

  return (
    <nav className={clsx(
      "sticky top-0 z-50 transition-all duration-300",
      scrolled
        ? "glass border-b border-race-border shadow-lg shadow-black/20"
        : "bg-race-black/80 border-b border-race-border/50"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative">
              <div className="w-7 h-7 bg-neon-purple rounded-sm flex items-center justify-center">
                <span className="text-white font-display font-black text-xs">A</span>
              </div>
              <div className="absolute inset-0 bg-neon-purple rounded-sm blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            </div>
            <span className="font-display font-bold text-lg text-race-text tracking-widest">
              APEX <span className="text-neon-purple">TIMING</span>
            </span>
          </Link>

          {/* Desktop nav — icon only with tooltip */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={clsx(
                    "relative group flex items-center justify-center w-9 h-9 rounded transition-all duration-200",
                    active
                      ? "text-neon-purple bg-neon-purple-glow border border-neon-purple/30"
                      : "text-race-dim hover:text-race-text hover:bg-race-muted"
                  )}
                >
                  <Icon size={15} />
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-race-card border border-race-border rounded text-[10px] font-mono text-race-text tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-1.5">
            {user ? (
              <>
                {/* PRO badge */}
                <Link
                  href="/pro"
                  title="PRO"
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono rounded transition-all",
                    pathname === "/pro"
                      ? "text-neon-purple bg-neon-purple-glow border border-neon-purple/30"
                      : "text-race-dim hover:text-race-text hover:bg-race-muted"
                  )}
                >
                  <Zap size={11} className="text-yellow-400" />
                  <span className="text-[10px]">PRO</span>
                </Link>

                <NotificationBell />

                {/* User dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-race-card border border-race-border hover:border-neon-purple/30 rounded text-xs font-mono text-race-dim hover:text-race-text transition-all"
                  >
                    <User size={11} className="text-neon-purple" />
                    <span className="text-race-text max-w-[90px] truncate">{user.email?.split("@")[0]}</span>
                    <ChevronDown size={10} className={clsx("transition-transform", userMenuOpen && "rotate-180")} />
                  </button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-10 w-44 rounded-xl border border-race-border shadow-2xl z-50 overflow-hidden py-1"
                      style={{ background: "#0f0f18", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(184,79,255,0.1)" }}
                    >
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-mono text-race-dim hover:text-race-text hover:bg-race-muted transition-colors"
                      >
                        <Settings size={12} />SETTINGS
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-mono text-red-400 hover:bg-race-muted transition-colors"
                        >
                          <Shield size={12} />ADMIN
                        </Link>
                      )}
                      <div className="h-px bg-race-border mx-3 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 px-4 py-2.5 w-full text-xs font-mono text-race-dim hover:text-red-400 hover:bg-race-muted transition-colors"
                      >
                        <LogOut size={12} />SIGN OUT
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/pro"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-race-dim hover:text-race-text hover:bg-race-muted rounded transition-all"
                >
                  <Zap size={11} className="text-yellow-400" />
                  <span className="text-[10px]">PRO</span>
                </Link>
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neon-purple hover:bg-neon-purple-dark text-white text-xs font-mono font-medium tracking-widest rounded transition-all duration-200"
                  style={{ boxShadow: "0 0 16px rgba(184,79,255,0.3)" }}
                >
                  <LogIn size={12} />SIGN IN
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-race-dim hover:text-race-text p-2"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu — full labels */}
        {mobileOpen && (
          <div className="md:hidden border-t border-race-border py-4 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded text-sm font-mono tracking-wider transition-all",
                  pathname === href
                    ? "text-neon-purple bg-neon-purple-glow"
                    : "text-race-dim hover:text-race-text hover:bg-race-muted"
                )}
              >
                <Icon size={16} />{label}
              </Link>
            ))}

            <div className="pt-3 border-t border-race-border mt-3 space-y-1">
              {user ? (
                <>
                  <div className="px-4 py-2 text-xs font-mono text-race-dim">{user.email}</div>
                  <Link href="/pro" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-race-dim hover:text-race-text hover:bg-race-muted rounded transition-colors">
                    <Zap size={16} className="text-yellow-400" />PRO
                  </Link>
                  <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-race-dim hover:text-race-text hover:bg-race-muted rounded transition-colors">
                    <Settings size={16} />SETTINGS
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-red-400 hover:bg-race-muted rounded transition-colors">
                      <Shield size={16} />ADMIN
                    </Link>
                  )}
                  <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 w-full text-sm font-mono text-red-400 hover:bg-race-muted rounded transition-colors">
                    <LogOut size={16} />SIGN OUT
                  </button>
                </>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    driver_name: "",
    team_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (!formData.driver_name.trim()) {
          setError("Driver name is required");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              driver_name: formData.driver_name.trim(),
              team_name: formData.team_name.trim() || null,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from("users").upsert({
            id: data.user.id,
            email: formData.email,
            driver_name: formData.driver_name.trim(),
            team_name: formData.team_name.trim() || null,
          });
        }

        setSuccess("Account created! Redirecting...");
        setTimeout(() => router.push("/"), 1500);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;

        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-neon-purple rounded-xl mb-4">
            <span className="font-display font-black text-2xl text-white">A</span>
          </div>
          <h1 className="font-display font-black text-3xl text-race-text tracking-wider">
            APEX TIMING
          </h1>
          <p className="text-race-dim font-mono text-xs tracking-widest mt-1">
            DRIVER ACCESS PORTAL
          </p>
        </div>

        <div className="race-card p-8">
          <div className="flex rounded-lg overflow-hidden border border-race-border mb-8 bg-race-muted">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono font-medium tracking-widest transition-all duration-200",
                  mode === m ? "bg-neon-purple text-white" : "text-race-dim hover:text-race-text"
                )}
              >
                {m === "signin" ? <LogIn size={13} /> : <UserPlus size={13} />}
                {m === "signin" ? "SIGN IN" : "REGISTER"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="section-label block mb-2">DRIVER NAME</label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData((p) => ({ ...p, driver_name: e.target.value }))}
                  placeholder="Your racing name"
                  className="input-field"
                  required
                />
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="section-label block mb-2">TEAM NAME <span className="text-race-dim/40 normal-case tracking-normal font-sans font-normal text-xs">(optional)</span></label>
                <input
                  type="text"
                  value={formData.team_name}
                  onChange={(e) => setFormData((p) => ({ ...p, team_name: e.target.value }))}
                  placeholder="Your team or club"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="section-label block mb-2">EMAIL</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="driver@team.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="section-label block mb-2">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                  className="input-field pr-10"
                  required
                  minLength={mode === "signup" ? 8 : 1}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-race-dim hover:text-race-text transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-mono">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-neon-green/10 border border-neon-green/20 rounded text-neon-green text-xs font-mono">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-neon-purple hover:bg-neon-purple-dark disabled:opacity-50
                text-white font-display font-bold tracking-widest py-3.5 rounded-lg transition-all duration-200 mt-2"
              style={{ boxShadow: "0 0 20px rgba(184,79,255,0.2)" }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "signin" ? (
                <><LogIn size={16} />ENTER PADDOCK</>
              ) : (
                <><UserPlus size={16} />CREATE ACCOUNT</>
              )}
            </button>
          </form>
        </div>

        <p className="text-race-dim/50 text-xs font-mono text-center mt-6">
          FOR IRACING TEAMS ONLY · UNOFFICIAL TOOL
        </p>
      </div>
    </div>
  );
}

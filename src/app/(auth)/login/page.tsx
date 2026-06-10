"use client";

/**
 * /login — Auth Page
 * Two modes toggled by the user:
 *   1. Email + Password  (default)
 *   2. Magic Link (passwordless)
 *
 * After successful login → redirect to /dashboard
 * If already logged in (middleware) → this page is never reached
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";

function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/dashboard";
  const supabase     = getSupabaseBrowser();

  const [mode,       setMode]       = useState<Mode>("password");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [magicSent,  setMagicSent]  = useState(false);

  // ── Email + Password ─────────────────────────────────────────
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // ── Magic Link ───────────────────────────────────────────────
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  // ── Magic link sent state ────────────────────────────────────
  if (magicSent) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Check your email</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a magic link to <strong>{email}</strong>.
            <br />Click the link to sign in — it expires in 1 hour.
          </p>
        </div>
        <button
          onClick={() => { setMagicSent(false); setEmail(""); }}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border bg-muted/50 p-1 gap-1">
        {([
          { value: "password" as Mode, label: "Password",   icon: Lock     },
          { value: "magic"    as Mode, label: "Magic Link", icon: Sparkles },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => { setMode(value); setError(null); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
              mode === value
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
        className="space-y-4"
      >
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            Email address
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className={cn(
                "block w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                error ? "border-destructive" : "border-input"
              )}
            />
          </div>
        </div>

        {/* Password (only in password mode) */}
        {mode === "password" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  "block w-full rounded-lg border bg-background pl-9 pr-10 py-2.5 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
                  error ? "border-destructive" : "border-input"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Magic link hint */}
        {mode === "magic" && (
          <p className="text-xs text-muted-foreground">
            We'll email you a secure link — no password needed.
            The link expires after 1 hour.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-60 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          )}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {mode === "password"
            ? loading ? "Signing in…" : "Sign in"
            : loading ? "Sending link…" : "Send magic link"}
        </button>
      </form>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground">
        Contact your IT administrator if you don't have an account.
      </p>
    </div>
  );
}

import { Suspense } from "react";
export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

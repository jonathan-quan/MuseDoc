"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Mode = "signin" | "signup";

/**
 * Sign-in / sign-up shown as a modal over the landing page (there is no
 * standalone /login route). Closes on backdrop click, Escape, or the X.
 */
export default function AuthDialog({
  initialMode = "signin",
  onClose,
}: {
  initialMode?: Mode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        // Email confirmation is disabled — the user is signed in immediately.
        router.push("/drive");
        router.refresh();
      } else {
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else {
        router.push("/drive");
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signin" ? "Sign in" : "Create an account"}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-[var(--ink-mute)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
        >
          <X size={16} />
        </button>

        <div className="flex items-center justify-center">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
            MuseDoc
          </h1>
        </div>
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--paper)] text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)]"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            or
          </span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-[var(--line-2)] bg-[var(--paper)] px-3.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-mute)] focus:border-[var(--ink-mute)]"
          />
          <input
            type="password"
            required
            minLength={6}
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="h-11 w-full rounded-xl border border-[var(--line-2)] bg-[var(--paper)] px-3.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-mute)] focus:border-[var(--ink-mute)]"
          />

          {error && (
            <p className="text-sm text-[var(--accent)]">{error}</p>
          )}
          {info && (
            <p className="text-sm text-green-700 dark:text-green-400">{info}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-[var(--ink)] text-sm font-medium text-[var(--paper)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Sign up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--ink-soft)]">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="font-medium text-[var(--ink)] underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

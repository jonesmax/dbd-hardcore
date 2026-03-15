"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setBusy(false);
    const error = "error" in result ? result.error : null;
    if (error) {
      const isUnconfirmed = /not confirmed|confirm your email/i.test(error.message);
      setMessage({
        type: "err",
        text: isUnconfirmed
          ? "Email not confirmed. In Supabase Dashboard → SQL Editor, run the query in supabase/confirm-email-users.sql, then sign in again."
          : error.message,
      });
      return;
    }
    if (isSignUp) {
      setMessage({ type: "ok", text: "Account created. Signing you in…" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h1 className="mb-2 text-xl font-bold text-[var(--foreground)]">DBD Hardcore Killer Economy</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">Sign in or create an account to save your progress.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            />
          </div>
          {message && (
            <p className={message.type === "ok" ? "text-[var(--success)]" : "text-[var(--danger)]"}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : isSignUp ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp((v) => !v); setMessage(null); }}
            className="text-sm text-[var(--muted)] hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}

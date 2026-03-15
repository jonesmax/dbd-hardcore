"use client";

import { useState, useRef, useMemo } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { KillerCard } from "@/components/KillerCard";
import { KillerModal } from "@/components/KillerModal";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { StatsPanel } from "@/components/StatsPanel";
import { LogMatchForm } from "@/components/LogMatchForm";
import { MatchTimeline } from "@/components/MatchTimeline";
import { BalanceChart } from "@/components/BalanceChart";
import { WinTracker } from "@/components/WinTracker";
import { SettingsModal } from "@/components/SettingsModal";
import { AuthForm } from "@/components/AuthForm";
import { hasSupabase } from "@/lib/supabase";
import type { KillerState } from "@/types";
import { TIER_ORDER, DEFAULT_SETTINGS, TIER_COLORS } from "@/types";

function Dashboard() {
  const { user, signOut } = useAuth();
  const { session, exportJson, importJson, undoLastMatch } = useSession();
  const [selectedKiller, setSelectedKiller] = useState<KillerState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logMatchOpen, setLogMatchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = session.settings ?? DEFAULT_SETTINGS;

  const killersByTier = useMemo(() => {
    const map = new Map<string, KillerState[]>();
    for (const tier of TIER_ORDER) {
      map.set(tier, session.killers.filter((k) => k.tier === tier));
    }
    return map;
  }, [session.killers]);

  function handleExport() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dbd-economy-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (importJson(text)) {
        alert("Session imported.");
      } else {
        alert("Invalid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            DBD Hardcore Killer Economy
          </h1>
          <div className="flex items-center gap-2">
            {user && (
              <>
                <span className="text-sm text-[var(--muted)] truncate max-w-[120px]" title={user.email}>{user.email}</span>
                <button type="button" onClick={() => signOut()} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]">Sign out</button>
              </>
            )}
            <button
              type="button"
              onClick={() => setLogMatchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--success)] text-lg font-bold text-white hover:opacity-90"
              title="Log match"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => undoLastMatch()}
              disabled={session.matchHistory.length === 0}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo last match"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            >
              Export JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            >
              Import JSON
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border-2 border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
            >
              ⚙ Settings
            </button>
            <BalanceDisplay />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-stretch lg:gap-6">
        <div className="min-w-0 flex-1">
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">Your performance</h2>
            <div className="mb-4">
              <WinTracker />
            </div>
            <StatsPanel />
            <div className="mt-4">
              <BalanceChart />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">Killers</h2>
          <div className="space-y-6">
            {TIER_ORDER.map((tier) => {
              const killers = killersByTier.get(tier) ?? [];
              if (killers.length === 0) return null;
              const tierColor = TIER_COLORS[tier];
              return (
                <div
                  key={tier}
                  className="rounded-xl border-2 p-4"
                  style={{ borderColor: tierColor, backgroundColor: `${tierColor}12` }}
                >
                  <h3
                    className="mb-3 text-center text-sm font-bold uppercase tracking-wider"
                    style={{ color: tierColor }}
                  >
                    {tier} tier
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {killers.map((killer) => (
                      <KillerCard
                        key={killer.id}
                        killer={killer}
                        onSelect={setSelectedKiller}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>

        <div className="mt-6 flex min-h-[280px] w-full shrink-0 flex-col lg:mt-0 lg:min-h-0 lg:w-72">
          <MatchTimeline />
        </div>
      </main>

      {selectedKiller && (
        <KillerModal killer={selectedKiller} onClose={() => setSelectedKiller(null)} />
      )}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
      {logMatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setLogMatchOpen(false)}>
          <div className="w-full max-w-md rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Log match</h2>
              <button type="button" onClick={() => setLogMatchOpen(false)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)]">✕</button>
            </div>
            <LogMatchForm onClose={() => setLogMatchOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }
  if (hasSupabase && !user) {
    return <AuthForm />;
  }
  return (
    <SessionProvider>
      <Dashboard />
    </SessionProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

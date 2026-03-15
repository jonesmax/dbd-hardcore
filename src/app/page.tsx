"use client";

import { useState, useMemo } from "react";
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
import { ProfileModal } from "@/components/ProfileModal";
import { AuthForm } from "@/components/AuthForm";
import { hasSupabase } from "@/lib/supabase";
import type { KillerState } from "@/types";
import { TIER_ORDER, TIER_COLORS } from "@/types";

type KillerFilter = "all" | "unlocked" | "locked";

function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { session } = useSession();
  const [selectedKiller, setSelectedKiller] = useState<KillerState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logMatchOpen, setLogMatchOpen] = useState(false);
  const [killerSearch, setKillerSearch] = useState("");
  const [killerFilter, setKillerFilter] = useState<KillerFilter>("all");
  const [timelineOpen, setTimelineOpen] = useState(true);

  const killersByTier = useMemo(() => {
    const q = killerSearch.trim().toLowerCase();
    let filtered = session.killers;
    if (q) {
      filtered = filtered.filter(
        (k) =>
          k.name.toLowerCase().includes(q) || k.id.toLowerCase().includes(q)
      );
    }
    if (killerFilter === "unlocked") filtered = filtered.filter((k) => k.status === "Unlocked");
    else if (killerFilter === "locked") filtered = filtered.filter((k) => k.status === "Locked" || k.status === "Dead");
    const map = new Map<string, KillerState[]>();
    for (const tier of TIER_ORDER) {
      map.set(tier, filtered.filter((k) => k.tier === tier));
    }
    return map;
  }, [session.killers, killerSearch, killerFilter]);

  const displayName = profile.username || user?.email?.split("@")[0] || "Player";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <h1 className="shrink-0 text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl">
            DBD Killer Economy
          </h1>

          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div className="flex h-10 items-stretch overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)]/50 shadow-inner ring-1 ring-black/5">
              <div className="flex h-full items-center gap-1 border-r border-[var(--border)] px-2.5">
                <span className="max-w-[100px] truncate text-sm font-medium text-[var(--foreground)]" title={user?.email ?? ""}>
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  title="Sign out"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
              <BalanceDisplay compact />
              <div className="flex h-full items-center border-l border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="h-full rounded-none border-r border-[var(--border)] px-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                  title="Profile"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="h-full rounded-none px-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                  title="Settings"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {!timelineOpen && (
        <button
          type="button"
          onClick={() => setTimelineOpen(true)}
          className="fixed z-40 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--accent)] shadow-md hover:bg-[var(--accent)] hover:text-white"
          style={{
            top: "4.5rem",
            right: "0.4rem",
          }}
          title="Open timeline"
        >
          Timeline
        </button>
      )}

      <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-stretch lg:gap-6">
        <div className={`min-w-0 flex-1 ${!timelineOpen ? "max-w-full" : ""}`}>
          <section className="mb-6">
            <h2 className="mb-3 text-base font-bold text-[var(--foreground)]">Performance</h2>
            <div className="mb-4">
              <WinTracker />
            </div>
            <StatsPanel />
            <div className="mt-4">
              <BalanceChart />
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-base font-bold text-[var(--foreground)]">Killers</h2>
              <input
                type="search"
                placeholder="Search…"
                value={killerSearch}
                onChange={(e) => setKillerSearch(e.target.value)}
                className="h-9 max-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label="Search killers"
              />
              <div className="flex rounded-lg border border-[var(--border)] p-0.5">
                <button
                  type="button"
                  onClick={() => setKillerFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${killerFilter === "all" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setKillerFilter("unlocked")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${killerFilter === "unlocked" ? "bg-[var(--success)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"}`}
                >
                  Unlocked
                </button>
                <button
                  type="button"
                  onClick={() => setKillerFilter("locked")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${killerFilter === "locked" ? "bg-[var(--danger)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"}`}
                >
                  Locked
                </button>
              </div>
              <span className="text-sm text-[var(--muted)]">
                {session.killers.filter((k) => k.status === "Unlocked").length}/{session.killers.length} unlocked
              </span>
            </div>
            <div className="space-y-6">
              {TIER_ORDER.map((tier) => {
                const killers = killersByTier.get(tier) ?? [];
                if (killers.length === 0) return null;
                const tierColor = TIER_COLORS[tier];
                return (
                  <div
                    key={tier}
                    className="rounded-xl border-2 p-4 shadow-sm"
                    style={{ borderColor: tierColor, backgroundColor: `${tierColor}15` }}
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

        {timelineOpen && (
          <div className="mt-6 shrink-0 lg:mt-0 lg:self-start">
            <MatchTimeline
              onToggleCollapse={() => setTimelineOpen(false)}
              onLogMatch={() => setLogMatchOpen(true)}
            />
          </div>
        )}
      </main>

      {selectedKiller && (
        <KillerModal killer={selectedKiller} onClose={() => setSelectedKiller(null)} />
      )}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
      {logMatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setLogMatchOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Log match</h2>
              <button type="button" onClick={() => setLogMatchOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-hover)]">✕</button>
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

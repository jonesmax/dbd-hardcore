"use client";

import { useState, useEffect } from "react";
import type { Settings, Tier, KillerState } from "@/types";
import { TIER_ORDER, DEFAULT_SETTINGS } from "@/types";
import { useSession } from "@/context/SessionContext";
import { getSessionGenStats } from "@/lib/gameLogic";

interface SettingsModalProps {
  onClose: () => void;
}

function GenStatsSummary() {
  const { session } = useSession();
  const genStats = getSessionGenStats(session);
  if (genStats.matchesWithGens === 0) return <p className="mt-2 text-xs text-[var(--muted)]">No gen data recorded yet.</p>;
  return (
    <p className="mt-2 text-xs text-[var(--muted)]">
      Avg gens standing: {genStats.avgGensStanding.toFixed(1)}
    </p>
  );
}

function applyOverridesToKillers(killers: KillerState[], settings: Settings): KillerState[] {
  return killers.map((k) => {
    const tier = settings.killerTierOverrides[k.id] ?? k.tier;
    const baseCost = settings.tierBaseCosts[tier] ?? k.baseCost;
    const currentCost = Math.max(k.currentCost, baseCost);
    return { ...k, tier, baseCost, currentCost };
  });
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { session, setSession, reset, resetProgress, resetSettings } = useSession();
  const [form, setForm] = useState<Settings>(session.settings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    setForm(session.settings ?? DEFAULT_SETTINGS);
  }, [session.settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSession((prev) => ({
      ...prev,
      settings: form,
      killers: applyOverridesToKillers(prev.killers, form),
      updatedAt: new Date().toISOString(),
    }));
    onClose();
  }

  function setToken(kills: number, value: number) {
    setForm((f) => ({
      ...f,
      tokenByKills: { ...f.tokenByKills, [kills]: value },
    }));
  }

  function setTokenGens(gens: number, value: number) {
    setForm((f) => ({
      ...f,
      tokenByGens: { ...(f.tokenByGens ?? {}), [gens]: value },
    }));
  }

  function setTierCost(tier: Tier, value: number) {
    setForm((f) => ({
      ...f,
      tierBaseCosts: { ...f.tierBaseCosts, [tier]: value },
    }));
  }

  function setKillerTier(killerId: string, tier: Tier) {
    setForm((f) => ({
      ...f,
      killerTierOverrides: { ...f.killerTierOverrides, [killerId]: tier },
    }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Settings</h2>
          <p className="text-xs text-[var(--muted)]">Saved to session; export JSON to backup.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tokens per kill count</h3>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((k) => (
                <div key={k}>
                  <label className="mb-0.5 block text-xs text-[var(--muted)]">{k} kills</label>
                  <input
                    type="number"
                    value={form.tokenByKills[k] ?? 0}
                    onChange={(e) => setToken(k, parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tokens per gens standing (end of game)</h3>
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((g) => (
                <div key={g}>
                  <label className="mb-0.5 block text-xs text-[var(--muted)]">{g} gens</label>
                  <input
                    type="number"
                    value={form.tokenByGens?.[g] ?? 0}
                    onChange={(e) => setTokenGens(g, parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                  />
                </div>
              ))}
            </div>
            <GenStatsSummary />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Win condition</h3>
            <p className="mb-2 text-xs text-[var(--muted)]">You win when any enabled condition is met.</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label className="text-sm text-[var(--muted)]">Reach</label>
              <input
                type="number"
                min={0}
                value={form.winTargetBalance}
                onChange={(e) => setForm((f) => ({ ...f, winTargetBalance: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                className="w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
              />
              <span className="text-sm text-[var(--muted)]">tokens (0 = disabled)</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.winByUnlockAll}
                onChange={(e) => setForm((f) => ({ ...f, winByUnlockAll: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Also win by unlocking all killers</span>
            </label>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">When does the killer lock?</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="lockThreshold"
                  checked={form.lockThreshold === 1}
                  onChange={() => setForm((f) => ({ ...f, lockThreshold: 1 }))}
                  className="rounded-full"
                />
                <span className="text-sm">Lock only on 0–1 kills (Neutral does not lock)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="lockThreshold"
                  checked={form.lockThreshold === 2}
                  onChange={() => setForm((f) => ({ ...f, lockThreshold: 2 }))}
                  className="rounded-full"
                />
                <span className="text-sm">Lock on 0–2 kills (Neutral locks killer)</span>
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tier base costs (default tokens per tier)</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TIER_ORDER.map((t) => (
                <div key={t}>
                  <label className="mb-0.5 block text-xs text-[var(--muted)]">{t}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.tierBaseCosts[t] ?? 0}
                    onChange={(e) => setTierCost(t, Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)]"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Killer tier (per killer)</h3>
            <p className="mb-2 text-xs text-[var(--muted)]">Override tier for each killer. Unlock cost is always the tier cost from above.</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--surface-hover)]">
                  <tr className="text-left text-[var(--muted)]">
                    <th className="px-2 py-1.5 font-medium">Killer</th>
                    <th className="px-2 py-1.5 font-medium">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {session.killers.map((k) => {
                    const tier = form.killerTierOverrides[k.id] ?? k.tier;
                    return (
                      <tr key={k.id} className="border-t border-[var(--border)]/50">
                        <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{k.name}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={tier}
                            onChange={(e) => setKillerTier(k.id, e.target.value as Tier)}
                            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-1 text-[var(--foreground)]"
                          >
                            {TIER_ORDER.map((t) => (
                              <option key={t} value={t}>{t} ({form.tierBaseCosts[t] ?? 0} tokens)</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--danger)]">Reset</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset progress? Match history, token balance, and all unlocks will be cleared. Settings stay. This cannot be undone.")) {
                    resetProgress();
                    onClose();
                  }
                }}
                className="rounded-lg border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)]"
              >
                Reset progress
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset settings to defaults? Token costs, lock rules, and win conditions will be reverted. Progress and match history stay.")) {
                    resetSettings();
                    setForm(DEFAULT_SETTINGS);
                  }
                }}
                className="rounded-lg border border-[var(--warn)] px-4 py-2 text-sm font-medium text-[var(--warn)] hover:bg-[var(--warn)]/10"
              >
                Reset settings
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--success)] px-4 py-2 font-bold text-black hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

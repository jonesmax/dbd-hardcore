"use client";

import { useState, useEffect } from "react";
import type { KillerState } from "@/types";
import { useSession } from "@/context/SessionContext";
import { getKillerStats } from "@/lib/gameLogic";
import { killerImageSrc } from "@/lib/assetPath";

interface KillerModalProps {
  killer: KillerState | null;
  onClose: () => void;
}

const TIER_CLASS: Record<string, string> = {
  "S+": "tier-s-plus",
  "S": "tier-s",
  "A": "tier-a",
  "B": "tier-b",
  "C": "tier-c",
  "Special/New": "tier-special",
};

export function KillerModal({ killer, onClose }: KillerModalProps) {
  const { session, unlock } = useSession();

  if (!killer) return null;

  const locked = killer.status !== "Unlocked";
  const statusLabel = killer.status === "Dead" ? "Dead" : "Locked";
  const canAfford = session.tokenBalance >= killer.currentCost;
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [killer.id]);
  const imageSrc = killerImageSrc(killer.id);

  function handleUnlock() {
    if (!killer || !locked || !canAfford) return;
    unlock(killer.id);
    onClose();
  }

  const unlockButtonLabel = killer.status === "Dead" ? "Revive for" : "Unlock for";
  const stats = getKillerStats(session, killer.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-xl border-2 shadow-xl ${
          locked ? "border-[var(--locked-border)] bg-[var(--locked-bg)]" : "border-[var(--unlocked-border)] bg-[var(--unlocked-bg)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative h-48 w-full overflow-hidden ${locked ? "[filter:grayscale(0.7)_brightness(0.55)]" : ""}`}
        >
          <img
            key={killer.id}
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            onError={() => setImgError(true)}
          />
          {imgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]">
              <span className="text-7xl font-bold text-[var(--muted)]">{killer.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
          {locked && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "var(--locked-overlay)" }}
            >
              <span className="locked-badge rounded-md border-2 border-[var(--danger)] bg-[var(--danger)]/55 px-4 py-2 text-lg font-bold uppercase tracking-wider text-white">
                {statusLabel}
              </span>
            </div>
          )}
          {!locked && (
            <div className="absolute right-2 top-2 rounded bg-[var(--success)] px-2 py-1 text-xs font-bold uppercase text-black">
              Unlocked
            </div>
          )}
        </div>
        <div className="border-t border-[var(--border)] p-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{killer.name}</h2>
          <p className={`text-sm font-medium ${TIER_CLASS[killer.tier] ?? ""}`}>{killer.tier} tier</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            <li>Matches: {killer.matchesPlayed}</li>
            <li>Wins / Neutrals / Losses: {stats.wins} / {stats.neutrals} / {stats.losses}</li>
            <li>Total kills: {killer.totalKills}</li>
            <li>Deaths: {killer.lossCount}</li>
            <li>Current streak: {stats.currentStreak} · Best streak: {stats.bestStreak}</li>
            {stats.matchesWithGens > 0 && (
              <li>Avg gens standing: {stats.avgGensStanding.toFixed(1)}</li>
            )}
            <li>Status: <span className={locked ? "text-[var(--danger)] font-semibold" : "text-[var(--success)] font-semibold"}>{killer.status}</span></li>
            <li>Cost: {killer.currentCost} tokens</li>
          </ul>
          {locked && (
            <div className="mt-4">
              {canAfford ? (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="w-full rounded-lg bg-[var(--success)] py-2.5 font-bold text-black hover:opacity-90"
                >
                  {unlockButtonLabel} {killer.currentCost} tokens
                </button>
              ) : (
                <p className="text-center text-sm text-[var(--muted)]">
                  Need {killer.currentCost - session.tokenBalance} more tokens to unlock
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

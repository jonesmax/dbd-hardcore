"use client";

import { useState, useEffect } from "react";
import type { KillerState, Tier } from "@/types";
import { useSession } from "@/context/SessionContext";
import { getKillerStats } from "@/lib/gameLogic";
import { killerImageSrc } from "@/lib/assetPath";

const TIER_CLASS: Record<Tier, string> = {
  "S+": "tier-group-s-plus",
  "S": "tier-group-s",
  "A": "tier-group-a",
  "B": "tier-group-b",
  "C": "tier-group-c",
  "Special/New": "tier-group-special",
};

interface KillerCardProps {
  killer: KillerState;
  onSelect: (killer: KillerState) => void;
}

export function KillerCard({ killer, onSelect }: KillerCardProps) {
  const { session } = useSession();
  const locked = killer.status !== "Unlocked";
  const statusLabel = killer.status === "Dead" ? "Dead" : "Locked";
  const canAfford = session.tokenBalance >= killer.currentCost;
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [killer.id]);
  const imageSrc = killerImageSrc(killer.id);
  const tierClass = TIER_CLASS[killer.tier] ?? "";
  const stats = getKillerStats(session, killer.id);
  const statsLine =
    killer.matchesPlayed > 0
      ? `${stats.wins}W ${stats.neutrals}N ${stats.losses}L${killer.lossCount > 0 ? ` · ${killer.lossCount} death(s)` : ""}${stats.currentStreak > 0 ? ` · ${stats.currentStreak} streak` : ""}`
      : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(killer)}
      className={`
        group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-200
        ${tierClass}
        ${locked ? "killer-card-locked" : "killer-card-unlocked"}
        ${locked && !canAfford ? "cursor-not-allowed opacity-80" : "cursor-pointer"}
      `}
    >
      <div className="killer-card-image-wrap relative h-36 w-full overflow-hidden bg-[var(--surface)] transition-[filter] duration-200">
        <img
          key={killer.id}
          src={imageSrc}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover object-top transition-[filter] duration-200 ${locked ? "killer-img-locked" : ""}`}
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        {imgError ? (
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-[var(--muted)]">
            {killer.name.charAt(0)}
          </span>
        ) : null}
        {locked && (
          <span className="locked-badge absolute top-2 right-2 rounded-md border-2 border-[var(--danger)] bg-[var(--danger)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            {statusLabel}
          </span>
        )}
        {!locked && (
          <span className="absolute bottom-2 left-2 rounded-md border border-[var(--success)] bg-[var(--success)]/95 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-black shadow-md">
            Unlocked
          </span>
        )}
      </div>
      <div className="border-t border-[var(--border)]/50 p-2.5">
        <p className="font-semibold text-[var(--foreground)] truncate">{killer.name}</p>
        <p className="text-xs text-[var(--muted)]">
          {locked ? `${killer.currentCost} tokens to unlock` : "Ready"}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {statsLine ?? `${killer.matchesPlayed} matches · ${killer.totalKills} kills`}
        </p>
      </div>
    </button>
  );
}

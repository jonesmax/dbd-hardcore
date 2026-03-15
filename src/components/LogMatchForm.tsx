"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "@/context/SessionContext";
import { locksKiller, getTokensForKills, getTokensForGens, getMatchHistory } from "@/lib/gameLogic";
import type { Session } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

function tokenLabel(kills: number, gens: number, session: Session): string {
  const fromKills = getTokensForKills(session, kills);
  const fromGens = getTokensForGens(session, gens);
  const t = fromKills + fromGens;
  if (t >= 0) return `+${t} tokens`;
  return `${t} tokens`;
}

interface LogMatchFormProps {
  onClose?: () => void;
}

function getInitialKillerId(session: Session): string {
  const matches = getMatchHistory(session);
  const last = matches[0];
  if (!last) return "";
  const stillUnlocked = session.killers.some((k) => k.id === last.killerId && k.status === "Unlocked");
  return stillUnlocked ? last.killerId : "";
}

export function LogMatchForm({ onClose }: LogMatchFormProps) {
  const { session, playMatch } = useSession();
  const [selectedKillerId, setSelectedKillerId] = useState<string>(() => getInitialKillerId(session));
  const [kills, setKills] = useState<number>(2);
  const [gensStanding, setGensStanding] = useState<number>(5);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const killsRef = useRef(kills);
  const gensRef = useRef(gensStanding);
  useEffect(() => {
    killsRef.current = kills;
    gensRef.current = gensStanding;
  }, [kills, gensStanding]);

  const unlocked = session.killers.filter((k) => k.status === "Unlocked");
  const settings = session.settings ?? DEFAULT_SETTINGS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const submitKills = killsRef.current;
    const submitGens = gensRef.current;
    if (!selectedKillerId) {
      setMessage({ type: "err", text: "Select a killer." });
      return;
    }
    const k = session.killers.find((x) => x.id === selectedKillerId);
    if (!k) return;
    if (k.status !== "Unlocked") {
      setMessage({ type: "err", text: "That killer is locked. Unlock them first from the dashboard." });
      return;
    }
    playMatch(selectedKillerId, submitKills, submitGens);
    const result = submitKills >= 3 ? "Win" : submitKills === 2 ? "Neutral" : "Loss";
    const shouldLock = locksKiller(session, submitKills);
    const tokenFromKills = getTokensForKills(session, submitKills);
    const tokenFromGens = getTokensForGens(session, submitGens);
    const totalTokens = tokenFromKills + tokenFromGens;
    const tokenStr = totalTokens >= 0 ? `+${totalTokens}` : `${totalTokens}`;
    let msg = `Match recorded: ${submitKills} kill(s), ${submitGens} gens — ${result}. ${tokenStr} tokens.`;
    if (shouldLock) msg += " Killer is now locked.";
    setMessage({ type: "ok", text: msg });
    setKills(2);
    setGensStanding(5);
    onClose?.();
  }

  const resultLabel = kills >= 3
    ? "Win"
    : kills === 2
      ? "Neutral"
      : "Loss";
  const lockLabel = locksKiller(session, kills) ? " (locks killer)" : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Killer (unlocked only)</label>
        <select
          value={selectedKillerId}
          onChange={(e) => setSelectedKillerId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="">— Select killer —</option>
          {unlocked.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
          {unlocked.length === 0 && (
            <option value="" disabled>No killers unlocked</option>
          )}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Kills (0–4)</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setKills(n)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                kills === n
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {n} {n === 1 ? "kill" : "kills"}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Recording: <strong>{kills} kill{kills !== 1 ? "s" : ""}</strong> — {resultLabel}{lockLabel}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Gens standing at end (0–5)</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setGensStanding(n)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                gensStanding === n
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Total: {tokenLabel(kills, gensStanding, session)}
        </p>
      </div>
      {message && (
        <p className={message.type === "ok" ? "text-[var(--success)]" : "text-[var(--danger)]"}>{message.text}</p>
      )}
      <button
        type="submit"
        disabled={unlocked.length === 0}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
      >
        Record match
      </button>
    </form>
  );
}

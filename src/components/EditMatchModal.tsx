"use client";

import { useState, useEffect } from "react";
import type { MatchRecord } from "@/types";
import { useSession } from "@/context/SessionContext";

interface EditMatchModalProps {
  match: MatchRecord;
  onClose: () => void;
  onSave: (updates: { killerId?: string; kills?: number; gensStanding?: number }) => void;
}

export function EditMatchModal({ match, onClose, onSave }: EditMatchModalProps) {
  const { session } = useSession();
  const [killerId, setKillerId] = useState(match.killerId);
  const [kills, setKills] = useState(match.kills);
  const [gensStanding, setGensStanding] = useState(match.gensStanding ?? 5);

  useEffect(() => {
    setKillerId(match.killerId);
    setKills(match.kills);
    setGensStanding(match.gensStanding ?? 5);
  }, [match]);

  const allKillers = session.killers;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ killerId, kills, gensStanding });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Edit match</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Killer</label>
            <select
              value={killerId}
              onChange={(e) => setKillerId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
            >
              {allKillers.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
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
                  {n}
                </button>
              ))}
            </div>
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

"use client";

import { useSession } from "@/context/SessionContext";
import { DEFAULT_SETTINGS } from "@/types";
import { getWinChecklist } from "@/lib/gameLogic";

interface BalanceDisplayProps {
  compact?: boolean;
  checklistOpen?: boolean;
  onToggleChecklist?: () => void;
}

export function BalanceDisplay({ compact, checklistOpen = false, onToggleChecklist }: BalanceDisplayProps) {
  const { session } = useSession();
  const isNegative = session.tokenBalance < 0;
  const settings = session.settings ?? DEFAULT_SETTINGS;
  const goal = settings.winTargetBalance;
  const showGoal = goal > 0;
  const progress = showGoal && goal > 0 ? Math.min(100, (session.tokenBalance / goal) * 100) : 0;
  const checklist = getWinChecklist(session);
  const completeCount = checklist.filter((c) => c.completed).length;

  if (compact) {
    return (
      <div className="relative flex h-10 shrink-0 items-center border-l border-[var(--border)]">
        <button
          type="button"
          onClick={onToggleChecklist}
          className="flex h-full items-center gap-3 px-3 hover:bg-[var(--surface-hover)]"
          title="Toggle win checklist"
        >
          <div className={`flex items-center gap-2 ${isNegative ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Tokens
            </span>
            <span className="text-base font-bold tabular-nums">
              {session.tokenBalance}
              {showGoal && <span className="ml-0.5 text-sm font-medium text-[var(--muted)]">/ {goal}</span>}
            </span>
          </div>
          {showGoal && goal > 0 && (
            <div className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isNegative ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                style={{ width: `${Math.max(0, progress)}%` }}
              />
            </div>
          )}
          <span className="text-[10px] font-semibold text-[var(--muted)]">{completeCount}/3</span>
          <span className="text-xs text-[var(--muted)]">{checklistOpen ? "▴" : "▾"}</span>
        </button>
        {checklistOpen && (
          <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Win checklist</p>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${item.completed ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>{item.label}</p>
                    <p className="text-[11px] text-[var(--muted)]">{item.progress}</p>
                  </div>
                  <span className={`text-xs ${item.completed ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
                    {item.completed ? "✔" : "○"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 px-5 py-4 shadow-md ${
        isNegative
          ? "border-[var(--danger)] bg-[var(--danger-bg)]"
          : "border-[var(--accent)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
        Token balance
      </p>
      <p className={`mt-0.5 text-3xl font-extrabold tracking-tight ${isNegative ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
        {session.tokenBalance}
        {showGoal && (
          <span className="ml-1.5 text-lg font-semibold text-[var(--muted)]">
            / {goal}
          </span>
        )}
      </p>
      {showGoal && goal > 0 && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isNegative ? "bg-[var(--danger)]" : "bg-[var(--accent)]"
            }`}
            style={{ width: `${Math.max(0, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

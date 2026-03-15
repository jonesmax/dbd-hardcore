"use client";

import { useSession } from "@/context/SessionContext";
import { DEFAULT_SETTINGS } from "@/types";

interface BalanceDisplayProps {
  compact?: boolean;
}

export function BalanceDisplay({ compact }: BalanceDisplayProps) {
  const { session } = useSession();
  const isNegative = session.tokenBalance < 0;
  const settings = session.settings ?? DEFAULT_SETTINGS;
  const goal = settings.winTargetBalance;
  const showGoal = goal > 0;
  const progress = showGoal && goal > 0 ? Math.min(100, (session.tokenBalance / goal) * 100) : 0;

  if (compact) {
    return (
      <div className="flex h-10 shrink-0 items-center gap-3 border-l border-[var(--border)] px-3">
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

"use client";

import { useSession } from "@/context/SessionContext";
import { DEFAULT_SETTINGS } from "@/types";

export function BalanceDisplay() {
  const { session } = useSession();
  const isNegative = session.tokenBalance < 0;
  const settings = session.settings ?? DEFAULT_SETTINGS;
  const goal = settings.winTargetBalance;
  const showGoal = goal > 0;

  return (
    <div className={`rounded-xl border-2 px-4 py-3 ${
      isNegative ? "border-[var(--danger)] bg-[var(--danger-bg)]" : "border-[var(--accent)] bg-[var(--surface)]"
    }`}>
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Token balance</p>
      <p className={`text-2xl font-bold ${isNegative ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
        {showGoal ? `${session.tokenBalance} / ${goal}` : session.tokenBalance}
      </p>
      <p className="text-xs text-[var(--muted)]">tokens</p>
    </div>
  );
}

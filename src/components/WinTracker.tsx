"use client";

import { useSession } from "@/context/SessionContext";
import { DEFAULT_SETTINGS } from "@/types";

export function WinTracker() {
  const { session } = useSession();
  const settings = session.settings ?? DEFAULT_SETTINGS;
  const wonAt = session.wonAt ?? null;
  const hasWon = !!wonAt;
  const unlockedCount = session.killers.filter((k) => k.status === "Unlocked").length;
  const totalKillers = session.killers.length;
  const balanceTarget = settings.winTargetBalance;
  const winByUnlockAll = settings.winByUnlockAll;
  if (!hasWon) return null;

  const dateStr = wonAt ? new Date(wonAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";
  const reasons: string[] = [];
  if (balanceTarget > 0 && session.tokenBalance >= balanceTarget) reasons.push(`reached ${session.tokenBalance} tokens`);
  if (winByUnlockAll && unlockedCount === totalKillers) reasons.push("unlocked all killers");
  return (
    <div className="rounded-xl border-2 border-[var(--success)] bg-[var(--success-bg)] px-3 py-2">
      <p className="text-sm font-bold text-[var(--success)]">You won!</p>
      <p className="text-xs text-[var(--muted)]">
        {reasons.join(" and ")} on {dateStr}.
      </p>
    </div>
  );
}

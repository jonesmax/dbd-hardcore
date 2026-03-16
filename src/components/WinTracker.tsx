"use client";

import { useSession } from "@/context/SessionContext";
import { getWinChecklist } from "@/lib/gameLogic";

export function WinTracker() {
  const { session } = useSession();
  const wonAt = session.wonAt ?? null;
  const hasWon = !!wonAt;
  const checklist = getWinChecklist(session);
  if (!hasWon) return null;

  const dateStr = wonAt ? new Date(wonAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";
  const reasons = checklist.filter((i) => i.completed).map((i) => i.label.toLowerCase());
  return (
    <div className="rounded-xl border-2 border-[var(--success)] bg-[var(--success-bg)] px-3 py-2">
      <p className="text-sm font-bold text-[var(--success)]">You won!</p>
      <p className="text-xs text-[var(--muted)]">
        {reasons.join(" and ")} on {dateStr}.
      </p>
    </div>
  );
}

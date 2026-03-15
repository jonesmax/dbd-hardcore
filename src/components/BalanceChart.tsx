"use client";

import { useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { getMatchHistory } from "@/lib/gameLogic";
import type { Session } from "@/types";

/** Balance after each match (chronological). First point = balance before any match. */
function getBalancePoints(session: Session): number[] {
  const matchHistory = getMatchHistory(session);
  const totalEarned = matchHistory.reduce((s, m) => s + m.tokensEarned, 0);
  const initial = session.tokenBalance - totalEarned;
  const points = [initial];
  let running = initial;
  const chronological = [...matchHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  for (const m of chronological) {
    running += m.tokensEarned;
    points.push(running);
  }
  return points;
}

const CHART_HEIGHT = 48;
const CHART_WIDTH = 200;

export function BalanceChart() {
  const { session } = useSession();
  const points = useMemo(() => getBalancePoints(session), [session]);

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 2;
  const w = CHART_WIDTH - padding * 2;
  const h = CHART_HEIGHT - padding * 2;

  const toX = (i: number) => padding + (i / (points.length - 1)) * w;
  const toY = (v: number) => padding + h - ((v - min) / range) * h;

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Balance over time</p>
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} className="overflow-visible">
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">
        Start: {points[0]} → Now: {points[points.length - 1]} tokens
      </p>
    </div>
  );
}

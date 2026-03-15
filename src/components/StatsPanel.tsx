"use client";

import { useSession } from "@/context/SessionContext";
import { getSessionGenStats, getMatchHistory } from "@/lib/gameLogic";

export function StatsPanel() {
  const { session } = useSession();
  const matchHistory = getMatchHistory(session);

  const totalMatches = matchHistory.length;
  const totalKills = matchHistory.reduce((s, m) => s + m.kills, 0);
  const wins = matchHistory.filter((m) => m.result === "Win").length;
  const neutrals = matchHistory.filter((m) => m.result === "Neutral").length;
  const losses = matchHistory.filter((m) => m.result === "Loss").length;
  const unlockedCount = session.killers.filter((k) => k.status === "Unlocked").length;
  const genStats = getSessionGenStats(session);

  const avgKills = totalMatches > 0 ? (totalKills / totalMatches).toFixed(1) : "—";
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(0) : "—";
  const avgGens = genStats.matchesWithGens > 0 ? genStats.avgGensStanding.toFixed(1) : "—";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard label="Matches" value={totalMatches} />
      <StatCard label="Total kills" value={totalKills} />
      <StatCard label="Avg kills/match" value={avgKills} />
      <StatCard label="Win rate" value={`${winRate}%`} />
      <StatCard label="Wins" value={wins} className="text-[var(--success)]" />
      <StatCard label="Neutrals" value={neutrals} className="text-[var(--warn)]" />
      <StatCard label="Losses" value={losses} className="text-[var(--danger)]" />
      <StatCard label="Unlocked killers" value={`${unlockedCount}/${session.killers.length}`} />
      <StatCard label="Avg gens standing" value={avgGens} />
    </div>
  );
}

function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 ${className}`}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

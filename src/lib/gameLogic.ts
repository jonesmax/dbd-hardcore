import type { Session, KillerState, MatchRecord, MatchResult, SessionGenStats, LogEntry } from "@/types";
import { DEFAULT_TOKEN_BY_GENS } from "@/types";
import { getEmptyRun } from "@/lib/session";

export function getMatchHistory(session: Session): MatchRecord[] {
  return session.matchHistory;
}

export function checkWin(session: Session): boolean {
  const { winTargetBalance, winByUnlockAll } = session.settings;
  const unlockedCount = session.killers.filter((k) => k.status === "Unlocked").length;
  const balanceWin = winTargetBalance > 0 && session.tokenBalance >= winTargetBalance;
  const unlockAllWin = winByUnlockAll && unlockedCount === session.killers.length && session.killers.length > 0;
  return balanceWin || unlockAllWin;
}

export function getResult(kills: number): MatchResult {
  if (kills >= 3) return "Win";
  if (kills === 2) return "Neutral";
  return "Loss";
}

export function getTokensForKills(session: Session, kills: number): number {
  return session.settings.tokenByKills[kills] ?? 0;
}

export function getTokensForGens(session: Session, gensStanding: number): number {
  const g = Math.max(0, Math.min(5, Math.floor(gensStanding)));
  return session.settings.tokenByGens?.[g] ?? DEFAULT_TOKEN_BY_GENS[g] ?? 0;
}

export function locksKiller(session: Session, kills: number): boolean {
  return kills <= session.settings.lockThreshold;
}

export function processMatch(
  session: Session,
  killerId: string,
  kills: number,
  gensStanding: number = 5,
  options?: { isReplay?: boolean; existingRecord?: MatchRecord }
): { session: Session; record: MatchRecord } | null {
  const killer = session.killers.find((k) => k.id === killerId);
  if (!killer) return null;
  if (!options?.isReplay && killer.status !== "Unlocked") return null;
  if (options?.existingRecord && (options.existingRecord.killerId !== killerId || options.existingRecord.kills !== kills)) return null;

  const result = getResult(kills);
  const tokensFromKills = getTokensForKills(session, kills);
  const tokensFromGens = getTokensForGens(session, gensStanding);
  const tokensEarned = tokensFromKills + tokensFromGens;
  const shouldLock = locksKiller(session, kills);

  const updatedKillers: KillerState[] = session.killers.map((k) => {
    if (k.id !== killerId) return k;
    return {
      ...k,
      matchesPlayed: k.matchesPlayed + 1,
      totalKills: k.totalKills + kills,
      lossCount: k.lossCount + (shouldLock ? 1 : 0),
      status: shouldLock ? "Dead" : "Unlocked",
      currentCost: shouldLock ? k.currentCost + 2 : k.currentCost,
    };
  });

  const newBalance = session.tokenBalance + tokensEarned;
  const ts = options?.existingRecord?.timestamp ?? new Date().toISOString();
  const record: MatchRecord = {
    id: options?.existingRecord?.id ?? `match-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    killerId,
    killerName: killer.name,
    kills,
    result,
    tokensEarned,
    timestamp: ts,
    killerLockedAfter: shouldLock,
    gensStanding: Math.max(0, Math.min(5, Math.floor(gensStanding))),
    balanceAfter: newBalance,
  };

  const deadLogEntry: LogEntry | null = shouldLock
    ? {
        id: `dead-${record.id}`,
        kind: "dead",
        timestamp: record.timestamp,
        balanceAfter: newBalance,
        payload: { id: `dead-${record.id}`, killerId, killerName: killer.name, matchId: record.id },
      }
    : null;

  const newSession: Session = {
    ...session,
    tokenBalance: newBalance,
    killers: updatedKillers,
    matchHistory: [record, ...session.matchHistory],
    logEntries: deadLogEntry ? [deadLogEntry, ...session.logEntries] : session.logEntries,
    updatedAt: new Date().toISOString(),
  };

  const withWin =
    !newSession.wonAt && checkWin(newSession)
      ? { ...newSession, wonAt: new Date().toISOString() }
      : newSession;
  return { session: withWin, record };
}

export function unlockKiller(session: Session, killerId: string): Session | null {
  const killer = session.killers.find((k) => k.id === killerId);
  if (!killer || killer.status === "Unlocked") return null;
  if (session.tokenBalance < killer.currentCost) return null;

  const updatedKillers: KillerState[] = session.killers.map((k) =>
    k.id === killerId ? { ...k, status: "Unlocked" as const } : k
  );

  const newBalance = session.tokenBalance - killer.currentCost;
  const ts = new Date().toISOString();
  const unlockId = `unlock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const unlockEntry: LogEntry = {
    id: unlockId,
    kind: "unlock",
    timestamp: ts,
    balanceAfter: newBalance,
    payload: { id: unlockId, killerId, killerName: killer.name, cost: killer.currentCost },
  };

  const next: Session = {
    ...session,
    tokenBalance: newBalance,
    killers: updatedKillers,
    logEntries: [unlockEntry, ...session.logEntries],
    updatedAt: ts,
  };
  if (!next.wonAt && checkWin(next)) {
    next.wonAt = new Date().toISOString();
  }
  return next;
}

/** Returns session state as if the given match never happened. */
export function revertMatch(session: Session, record: MatchRecord): Session {
  const killer = session.killers.find((k) => k.id === record.killerId);
  if (!killer) return session;

  const updatedKillers: KillerState[] = session.killers.map((k) => {
    if (k.id !== record.killerId) return k;
    return {
      ...k,
      matchesPlayed: k.matchesPlayed - 1,
      totalKills: k.totalKills - record.kills,
      lossCount: k.lossCount - (record.killerLockedAfter ? 1 : 0),
      status: record.killerLockedAfter ? "Unlocked" : k.status,
      currentCost: record.killerLockedAfter ? k.currentCost - 2 : k.currentCost,
    };
  });

  const reverted: Session = {
    ...session,
    tokenBalance: session.tokenBalance - record.tokensEarned,
    killers: updatedKillers,
    matchHistory: session.matchHistory.filter((m) => m.id !== record.id),
    logEntries: session.logEntries.filter(
      (e) => !(e.kind === "dead" && (e.payload as { matchId?: string }).matchId === record.id)
    ),
    updatedAt: new Date().toISOString(),
  };
  if (reverted.wonAt && !checkWin(reverted)) {
    reverted.wonAt = undefined;
  }
  return reverted;
}

export interface KillerStats {
  wins: number;
  neutrals: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  /** Matches that have gensStanding recorded. */
  matchesWithGens: number;
  totalGensStanding: number;
  avgGensStanding: number;
}

export function getKillerStats(session: Session, killerId: string): KillerStats {
  const matches = [...getMatchHistory(session)]
    .filter((m) => m.killerId === killerId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let wins = 0,
    neutrals = 0,
    losses = 0;
  for (const m of matches) {
    if (m.result === "Win") wins++;
    else if (m.result === "Neutral") neutrals++;
    else losses++;
  }
  let currentStreak = 0,
    bestStreak = 0,
    run = 0;
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].result === "Win") {
      run++;
      if (i === matches.length - 1) currentStreak = run;
    } else break;
  }
  for (const m of matches) {
    if (m.result === "Win") {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else run = 0;
  }
  const withGens = matches.filter((m) => m.gensStanding !== undefined);
  const matchesWithGens = withGens.length;
  const totalGensStanding = withGens.reduce((s, m) => s + (m.gensStanding ?? 0), 0);
  const avgGensStanding = matchesWithGens > 0 ? totalGensStanding / matchesWithGens : 0;
  return { wins, neutrals, losses, currentStreak, bestStreak, matchesWithGens, totalGensStanding, avgGensStanding };
}

export function getSessionGenStats(session: Session): SessionGenStats {
  const withGens = getMatchHistory(session).filter((m) => m.gensStanding !== undefined);
  const matchesWithGens = withGens.length;
  const totalGensStanding = withGens.reduce((s, m) => s + (m.gensStanding ?? 0), 0);
  const avgGensStanding = matchesWithGens > 0 ? totalGensStanding / matchesWithGens : 0;
  return { matchesWithGens, totalGensStanding, avgGensStanding };
}

/** Replay matches in order to rebuild session (killers, balance, matchHistory, logEntries). */
function replaySessionFromMatches(
  settings: Session["settings"],
  matches: MatchRecord[],
  createdAt: string
): Session {
  const base = getEmptyRun(settings) as Session;
  let state: Session = {
    ...base,
    createdAt,
    updatedAt: new Date().toISOString(),
    wonAt: undefined,
  };
  const sorted = [...matches].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (const m of sorted) {
    const killer = state.killers.find((k) => k.id === m.killerId);
    if (!killer) continue;
    if (killer.status === "Locked") {
      const unlocked = unlockKiller(state, m.killerId);
      if (!unlocked) continue;
      state = unlocked;
    }
    const r = processMatch(state, m.killerId, m.kills, m.gensStanding ?? 5, { isReplay: true, existingRecord: m });
    if (!r) continue;
    state = r.session;
  }
  return state;
}

/** Replay all matches except the deleted one; returns new session. */
export function deleteMatch(session: Session, matchId: string): Session | null {
  const matchHistory = getMatchHistory(session);
  const match = matchHistory.find((m) => m.id === matchId);
  if (!match) return null;
  const remaining = matchHistory.filter((m) => m.id !== matchId);
  const state = replaySessionFromMatches(session.settings, remaining, session.createdAt);
  state.wonAt = checkWin(state) ? session.wonAt ?? state.wonAt : undefined;
  return state;
}

export interface EditMatchUpdates {
  killerId?: string;
  kills?: number;
  gensStanding?: number;
}

/** Edit a match: replace in history with updated fields, then replay all to recompute session. */
export function editMatch(
  session: Session,
  matchId: string,
  updates: EditMatchUpdates
): Session | null {
  const matchHistory = getMatchHistory(session);
  const match = matchHistory.find((m) => m.id === matchId);
  if (!match) return null;
  const killerId = updates.killerId ?? match.killerId;
  const kills = updates.kills ?? match.kills;
  const gensStanding = updates.gensStanding ?? match.gensStanding ?? 5;
  if (kills < 0 || kills > 4) return null;
  const g = Math.max(0, Math.min(5, Math.floor(gensStanding)));
  const killer = session.killers.find((k) => k.id === killerId);
  if (!killer) return null;

  const result = getResult(kills);
  const tokensEarned = getTokensForKills(session, kills) + getTokensForGens(session, g);
  const killerLockedAfter = locksKiller(session, kills);

  const updatedRecord: MatchRecord = {
    ...match,
    killerId,
    killerName: killer.name,
    kills,
    gensStanding: g,
    result,
    tokensEarned,
    killerLockedAfter,
  };

  const reordered = [...matchHistory].map((m) => (m.id === matchId ? updatedRecord : m));
  const state = replaySessionFromMatches(session.settings, reordered, session.createdAt);
  state.wonAt = checkWin(state) ? session.wonAt ?? state.wonAt : undefined;
  return state;
}

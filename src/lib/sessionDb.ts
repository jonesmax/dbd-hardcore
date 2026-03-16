import type { Session, KillerState, MatchRecord, Settings, LogEntry, LogEntryUnlockPayload, LogEntryDeadPayload, Tier } from "@/types";
import { supabase, hasSupabase } from "@/lib/supabase";
import { getSessionGenStats } from "@/lib/gameLogic";
import { DEFAULT_SETTINGS } from "@/types";

const saveQueueByUser = new Map<string, Promise<void>>();

function enqueueSaveForUser(userId: string, work: () => Promise<void>): Promise<void> {
  const prev = saveQueueByUser.get(userId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(work);
  saveQueueByUser.set(userId, next);
  return next.finally(() => {
    if (saveQueueByUser.get(userId) === next) {
      saveQueueByUser.delete(userId);
    }
  });
}

function settingsFromRow(r: {
  token_by_kills: Record<string, number>;
  token_by_gens: Record<string, number>;
  lock_threshold: number;
  tier_base_costs: Record<string, number>;
  killer_tier_overrides: Record<string, string>;
  win_target_balance: number;
  win_by_unlock_all: boolean;
}): Settings {
  return {
    tokenByKills: {
      0: r.token_by_kills?.["0"] ?? DEFAULT_SETTINGS.tokenByKills[0],
      1: r.token_by_kills?.["1"] ?? DEFAULT_SETTINGS.tokenByKills[1],
      2: r.token_by_kills?.["2"] ?? DEFAULT_SETTINGS.tokenByKills[2],
      3: r.token_by_kills?.["3"] ?? DEFAULT_SETTINGS.tokenByKills[3],
      4: r.token_by_kills?.["4"] ?? DEFAULT_SETTINGS.tokenByKills[4],
    },
    tokenByGens: {
      0: r.token_by_gens?.["0"] ?? DEFAULT_SETTINGS.tokenByGens[0],
      1: r.token_by_gens?.["1"] ?? DEFAULT_SETTINGS.tokenByGens[1],
      2: r.token_by_gens?.["2"] ?? DEFAULT_SETTINGS.tokenByGens[2],
      3: r.token_by_gens?.["3"] ?? DEFAULT_SETTINGS.tokenByGens[3],
      4: r.token_by_gens?.["4"] ?? DEFAULT_SETTINGS.tokenByGens[4],
      5: r.token_by_gens?.["5"] ?? DEFAULT_SETTINGS.tokenByGens[5],
    },
    lockThreshold: r.lock_threshold === 1 || r.lock_threshold === 2 ? r.lock_threshold : 2,
    tierBaseCosts: {
      "S+": r.tier_base_costs?.["S+"] ?? DEFAULT_SETTINGS.tierBaseCosts["S+"],
      "S": r.tier_base_costs?.["S"] ?? DEFAULT_SETTINGS.tierBaseCosts["S"],
      "A": r.tier_base_costs?.["A"] ?? DEFAULT_SETTINGS.tierBaseCosts["A"],
      "B": r.tier_base_costs?.["B"] ?? DEFAULT_SETTINGS.tierBaseCosts["B"],
      "C": r.tier_base_costs?.["C"] ?? DEFAULT_SETTINGS.tierBaseCosts["C"],
      "Special/New": r.tier_base_costs?.["Special/New"] ?? DEFAULT_SETTINGS.tierBaseCosts["Special/New"],
    },
    killerTierOverrides: (r.killer_tier_overrides && typeof r.killer_tier_overrides === "object" ? r.killer_tier_overrides : {}) as Settings["killerTierOverrides"],
    winTargetBalance: typeof r.win_target_balance === "number" ? r.win_target_balance : DEFAULT_SETTINGS.winTargetBalance,
    winByUnlockAll: typeof r.win_by_unlock_all === "boolean" ? r.win_by_unlock_all : true,
  };
}

function logEntryFromRow(row: Record<string, unknown>): LogEntry | null {
  try {
    const payload = row.payload as Record<string, unknown> | null | undefined;
    const ts = row.timestamp;
    const id = row.id;
    const balanceAfter = row.balance_after;
    if (id == null || ts == null || balanceAfter == null || payload == null || typeof payload !== "object") return null;
    const kind = row.kind as LogEntry["kind"];
    if (kind !== "unlock" && kind !== "dead") return null;
    return {
      id: String(id),
      kind,
      timestamp: String(ts).replace("Z", "Z"),
      balanceAfter: Number(balanceAfter),
      payload: payload as unknown as LogEntry["payload"],
    };
  } catch {
    return null;
  }
}

/** Apply session_log (unlock/dead) in time order so killer status matches the timeline. */
function applyLogEntriesToKillers(killers: KillerState[], logEntries: LogEntry[]): KillerState[] {
  if (!Array.isArray(logEntries) || logEntries.length === 0) return killers;
  try {
    const byId = new Map(killers.map((k) => [k.id, { ...k }]));
    const sorted = [...logEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const e of sorted) {
      const payload = e?.payload as unknown as Record<string, unknown> | undefined;
      if (!payload || typeof payload !== "object") continue;
      const killerId = (payload.killerId ?? payload.killer_id) as string | undefined;
      if (!killerId) continue;
      const k = byId.get(killerId);
      if (!k) continue;
      if (e.kind === "unlock") k.status = "Unlocked";
      else if (e.kind === "dead") k.status = "Dead";
    }
    return killers.map((k) => byId.get(k.id) ?? k);
  } catch {
    return killers;
  }
}

/** Load session from normalized tables (user_state, user_settings, user_killers, match_history, session_log). */
async function loadFromNormalizedTables(userId: string): Promise<Session | null> {
  if (!supabase) return null;

  const [stateRes, settingsRes, killersRes, matchesRes, logRes] = await Promise.all([
    supabase.from("user_state").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_killers").select("*").eq("user_id", userId).order("killer_id"),
    supabase.from("match_history").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
    supabase.from("session_log").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
  ]);

  if (stateRes.error) return null;

  const settings = settingsRes.data ? settingsFromRow(settingsRes.data as Parameters<typeof settingsFromRow>[0]) : DEFAULT_SETTINGS;
  const killers: KillerState[] = (killersRes.data ?? []).map((k: Record<string, unknown>) => ({
    id: k.killer_id as string,
    name: k.name as string,
    tier: k.tier as Tier,
    baseCost: k.base_cost as number,
    currentCost: k.current_cost as number,
    status: k.status as "Locked" | "Unlocked" | "Dead",
    matchesPlayed: (k.matches_played as number) ?? 0,
    totalKills: (k.total_kills as number) ?? 0,
    lossCount: (k.loss_count as number) ?? 0,
  }));

  const matchHistory: MatchRecord[] = [];
  for (const m of matchesRes.data ?? []) {
    try {
      const row = m as Record<string, unknown>;
      const ts = row.timestamp;
      if (row.id == null || row.killer_id == null || ts == null) continue;
      matchHistory.push({
        id: row.id as string,
        killerId: row.killer_id as string,
        killerName: (row.killer_name as string) ?? "",
        kills: Number(row.kills ?? 0),
        result: (row.result as MatchRecord["result"]) ?? "Neutral",
        tokensEarned: Number(row.tokens_earned ?? 0),
        timestamp: String(ts).replace("Z", "Z"),
        killerLockedAfter: Boolean(row.killer_locked_after),
        gensStanding: row.gens_standing != null ? Number(row.gens_standing) : undefined,
        balanceAfter: row.balance_after != null ? Number(row.balance_after) : undefined,
      });
    } catch {
      // skip bad row
    }
  }

  const logEntries: LogEntry[] = [];
  for (const row of logRes.data ?? []) {
    const e = logEntryFromRow(row as Record<string, unknown>);
    if (e) logEntries.push(e);
  }

  const state = stateRes.data as { token_balance: number; created_at: string; updated_at: string; won_at: string | null } | null;
  const now = new Date().toISOString();
  const createdAt = state?.created_at ?? (matchHistory.length > 0 || logEntries.length > 0
    ? (([...matchHistory, ...logEntries] as { timestamp: string }[])
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]?.timestamp ?? now)
    : now);
  const updatedAt = state?.updated_at ?? (matchHistory.length > 0 || logEntries.length > 0
    ? (([...matchHistory, ...logEntries] as { timestamp: string }[])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp ?? now)
    : now);
  const fallbackBalance = state?.token_balance ?? 0;

  // Apply session_log (unlock/dead) to killer status so it matches the timeline
  const killersWithStatus = applyLogEntriesToKillers(killers, logEntries);

  // Derive current balance from the latest event so header and timeline never get out of sync
  const allWithTs = [
    ...matchHistory.map((m) => ({ ts: new Date(m.timestamp).getTime(), balanceAfter: m.balanceAfter ?? fallbackBalance })),
    ...logEntries.map((e) => ({ ts: new Date(e.timestamp).getTime(), balanceAfter: e.balanceAfter })),
  ];
  const latest = allWithTs.length > 0 ? allWithTs.reduce((a, b) => (a.ts >= b.ts ? a : b)) : null;
  const tokenBalance = latest != null ? latest.balanceAfter : fallbackBalance;

  const session: Session = {
    tokenBalance,
    killers: killersWithStatus,
    matchHistory,
    logEntries,
    settings,
    createdAt,
    updatedAt,
    wonAt: state?.won_at ?? undefined,
  };
  session.genStats = getSessionGenStats(session);
  return session;
}

/** Save session to normalized tables. Never deletes progress unless clearProgress is true (e.g. user reset). */
async function saveToNormalizedTables(userId: string, session: Session, options?: { clearProgress?: boolean }): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  const clearProgress = options?.clearProgress === true;

  await supabase.from("user_state").upsert(
    {
      user_id: userId,
      token_balance: session.tokenBalance,
      updated_at: now,
      won_at: session.wonAt ?? null,
    },
    { onConflict: "user_id" }
  );

  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      token_by_kills: session.settings.tokenByKills as unknown as Record<string, number>,
      token_by_gens: session.settings.tokenByGens as unknown as Record<string, number>,
      lock_threshold: session.settings.lockThreshold,
      tier_base_costs: session.settings.tierBaseCosts as unknown as Record<string, number>,
      killer_tier_overrides: session.settings.killerTierOverrides as unknown as Record<string, string>,
      win_target_balance: session.settings.winTargetBalance,
      win_by_unlock_all: session.settings.winByUnlockAll,
    },
    { onConflict: "user_id" }
  );

  if (clearProgress) {
    const { data: oldKillers } = await supabase.from("user_killers").select("killer_id").eq("user_id", userId);
    const killerIdsToRemove = (oldKillers ?? []).map((r) => r.killer_id);
    if (killerIdsToRemove.length > 0) {
      await supabase.from("user_killers").delete().eq("user_id", userId).in("killer_id", killerIdsToRemove);
    }
    const { data: oldMatches } = await supabase.from("match_history").select("id").eq("user_id", userId);
    const matchIdsToRemove = (oldMatches ?? []).map((r) => r.id);
    if (matchIdsToRemove.length > 0) {
      await supabase.from("match_history").delete().eq("user_id", userId).in("id", matchIdsToRemove);
    }
    const { data: oldLogs } = await supabase.from("session_log").select("id").eq("user_id", userId);
    const logIdsToRemove = (oldLogs ?? []).map((r) => r.id);
    if (logIdsToRemove.length > 0) {
      await supabase.from("session_log").delete().eq("user_id", userId).in("id", logIdsToRemove);
    }
    if (session.killers.length > 0) {
      await supabase.from("user_killers").insert(
        session.killers.map((k) => ({
          user_id: userId,
          killer_id: k.id,
          name: k.name,
          tier: k.tier,
          base_cost: k.baseCost,
          current_cost: k.currentCost,
          status: k.status,
          matches_played: k.matchesPlayed,
          total_kills: k.totalKills,
          loss_count: k.lossCount,
        }))
      );
    }
    return;
  }

  if (session.killers.length > 0) {
    const killerRows = session.killers.map((k) => ({
      user_id: userId,
      killer_id: k.id,
      name: k.name,
      tier: k.tier,
      base_cost: k.baseCost,
      current_cost: k.currentCost,
      status: k.status,
      matches_played: k.matchesPlayed,
      total_kills: k.totalKills,
      loss_count: k.lossCount,
    }));
    await supabase.from("user_killers").upsert(killerRows, { onConflict: "user_id,killer_id" });
    const sessionKillerIds = new Set(session.killers.map((k) => k.id));
    const { data: existingKillers } = await supabase.from("user_killers").select("killer_id").eq("user_id", userId);
    const toDeleteKillers = (existingKillers ?? []).map((r) => r.killer_id).filter((id) => !sessionKillerIds.has(id));
    if (toDeleteKillers.length > 0) {
      await supabase.from("user_killers").delete().eq("user_id", userId).in("killer_id", toDeleteKillers);
    }
  }

  const matchRows = session.matchHistory.map((m) => ({
    id: m.id,
    user_id: userId,
    killer_id: m.killerId,
    killer_name: m.killerName,
    kills: m.kills,
    result: m.result,
    tokens_earned: m.tokensEarned,
    gens_standing: m.gensStanding ?? null,
    killer_locked_after: m.killerLockedAfter,
    timestamp: m.timestamp,
    balance_after: m.balanceAfter ?? session.tokenBalance,
  }));
  if (matchRows.length > 0) {
    await supabase.from("match_history").upsert(matchRows, { onConflict: "id" });
    const sessionMatchIds = new Set(session.matchHistory.map((m) => m.id));
    const { data: existingMatches } = await supabase.from("match_history").select("id").eq("user_id", userId);
    const toDeleteMatches = (existingMatches ?? []).map((r) => r.id).filter((id) => !sessionMatchIds.has(id));
    if (toDeleteMatches.length > 0) {
      await supabase.from("match_history").delete().eq("user_id", userId).in("id", toDeleteMatches);
    }
  }

  const logRows = session.logEntries.map((e) => ({
    id: e.id,
    user_id: userId,
    kind: e.kind,
    payload: e.payload as unknown as Record<string, unknown>,
    timestamp: e.timestamp,
    balance_after: e.balanceAfter,
  }));
  if (logRows.length > 0) {
    await supabase.from("session_log").upsert(logRows, { onConflict: "id" });
    const sessionLogIds = new Set(session.logEntries.map((e) => e.id));
    const { data: existingLogs } = await supabase.from("session_log").select("id").eq("user_id", userId);
    const toDeleteLogs = (existingLogs ?? []).map((r) => r.id).filter((id) => !sessionLogIds.has(id));
    if (toDeleteLogs.length > 0) {
      await supabase.from("session_log").delete().eq("user_id", userId).in("id", toDeleteLogs);
    }
  }
}

/** Load session from Supabase only. All data is fetched from DB; no local storage. */
export async function loadSession(userId: string | null): Promise<Session | null> {
  if (hasSupabase && supabase && userId) {
    return loadFromNormalizedTables(userId);
  }
  return null;
}

export interface SaveSessionOptions {
  /** When true, allow deleting all progress (e.g. user clicked Reset). Default false = never delete progress. */
  clearProgress?: boolean;
}

/** Save session to Supabase only. All data is persisted to DB; no local storage. */
export async function saveSession(userId: string | null, session: Session, options?: SaveSessionOptions): Promise<void> {
  if (!hasSupabase || !supabase || !userId) return;
  const toSave = { ...session, genStats: getSessionGenStats(session) };
  await enqueueSaveForUser(userId, () => saveToNormalizedTables(userId, toSave, options));
}

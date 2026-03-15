import type { Session, KillerState, MatchRecord, Settings, LogEntry, Tier } from "@/types";
import { supabase, hasSupabase } from "@/lib/supabase";
import { importSessionFromJson } from "@/lib/session";
import { getSessionGenStats } from "@/lib/gameLogic";
import { DEFAULT_SETTINGS } from "@/types";

const SESSION_KEY = "dbd-hardcore-session";

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
    winTargetBalance: typeof r.win_target_balance === "number" ? r.win_target_balance : 50,
    winByUnlockAll: typeof r.win_by_unlock_all === "boolean" ? r.win_by_unlock_all : true,
  };
}

function logEntryFromRow(row: Record<string, unknown>): LogEntry {
  const payload = row.payload as Record<string, unknown>;
  return {
    id: row.id as string,
    kind: row.kind as LogEntry["kind"],
    timestamp: (row.timestamp as string).replace("Z", "Z"),
    balanceAfter: row.balance_after as number,
    payload: payload as LogEntry["payload"],
  };
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

  if (stateRes.error || !stateRes.data) return null;
  const state = stateRes.data as { token_balance: number; created_at: string; updated_at: string; won_at: string | null };
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
  const matchHistory: MatchRecord[] = (matchesRes.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    killerId: m.killer_id as string,
    killerName: m.killer_name as string,
    kills: m.kills as number,
    result: m.result as MatchRecord["result"],
    tokensEarned: m.tokens_earned as number,
    timestamp: (m.timestamp as string).replace("Z", "Z"),
    killerLockedAfter: m.killer_locked_after as boolean,
    gensStanding: m.gens_standing != null ? (m.gens_standing as number) : undefined,
    balanceAfter: m.balance_after != null ? (m.balance_after as number) : undefined,
  }));
  const logEntries: LogEntry[] = (logRes.data ?? []).map((row: Record<string, unknown>) => logEntryFromRow(row));

  const session: Session = {
    tokenBalance: state.token_balance,
    killers,
    matchHistory,
    logEntries,
    settings,
    createdAt: state.created_at,
    updatedAt: state.updated_at,
    wonAt: state.won_at ?? undefined,
  };
  session.genStats = getSessionGenStats(session);
  return session;
}

/** Save session to normalized tables. */
async function saveToNormalizedTables(userId: string, session: Session): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();

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

  await supabase.from("user_killers").delete().eq("user_id", userId);
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

  await supabase.from("match_history").delete().eq("user_id", userId);
  if (session.matchHistory.length > 0) {
    await supabase.from("match_history").insert(
      session.matchHistory.map((m) => ({
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
      }))
    );
  }

  await supabase.from("session_log").delete().eq("user_id", userId);
  if (session.logEntries.length > 0) {
    await supabase.from("session_log").insert(
      session.logEntries.map((e) => ({
        id: e.id,
        user_id: userId,
        kind: e.kind,
        payload: e.payload as unknown as Record<string, unknown>,
        timestamp: e.timestamp,
        balance_after: e.balanceAfter,
      }))
    );
  }
}

/** Load session for the given user (normalized tables only when Supabase; else localStorage). */
export async function loadSession(userId: string | null): Promise<Session | null> {
  if (hasSupabase && supabase && userId) {
    return loadFromNormalizedTables(userId);
  }
  if (!hasSupabase && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return importSessionFromJson(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/** Save session for the given user (Supabase normalized tables or localStorage when no Supabase/user). */
export async function saveSession(userId: string | null, session: Session): Promise<void> {
  const toSave = { ...session, genStats: getSessionGenStats(session) };
  if (hasSupabase && supabase && userId) {
    await saveToNormalizedTables(userId, toSave);
    return;
  }
  if (!hasSupabase && typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }
}

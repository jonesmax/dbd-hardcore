import type { Session, KillerState, MatchRecord, Settings, TierBaseCosts, Tier } from "@/types";
import { KILLER_DEFINITIONS } from "@/data/killers";
import { INITIAL_TOKEN_BALANCE, DEFAULT_SETTINGS } from "@/types";
import { getSessionGenStats } from "@/lib/gameLogic";

function effectiveTier(killerId: string, defTier: Tier, overrides: Record<string, Tier>): Tier {
  return overrides[killerId] ?? defTier;
}

function tierCost(tier: Tier, tierBaseCosts: TierBaseCosts): number {
  return tierBaseCosts[tier] ?? 8;
}

function buildInitialKillers(settings: Settings): KillerState[] {
  const { tierBaseCosts, killerTierOverrides } = settings;
  return KILLER_DEFINITIONS.map((k) => {
    const tier = effectiveTier(k.id, k.tier, killerTierOverrides);
    const cost = tierCost(tier, tierBaseCosts);
    return {
      id: k.id,
      name: k.name,
      tier,
      baseCost: cost,
      currentCost: cost,
      status: "Locked" as const,
      matchesPlayed: 0,
      totalKills: 0,
      lossCount: 0,
    };
  });
}

function normalizeSettings(parsed: Partial<Session>): Settings {
  const s = parsed.settings;
  return {
    tokenByKills: {
      0: typeof s?.tokenByKills?.[0] === "number" ? s.tokenByKills[0] : DEFAULT_SETTINGS.tokenByKills[0],
      1: typeof s?.tokenByKills?.[1] === "number" ? s.tokenByKills[1] : DEFAULT_SETTINGS.tokenByKills[1],
      2: typeof s?.tokenByKills?.[2] === "number" ? s.tokenByKills[2] : DEFAULT_SETTINGS.tokenByKills[2],
      3: typeof s?.tokenByKills?.[3] === "number" ? s.tokenByKills[3] : DEFAULT_SETTINGS.tokenByKills[3],
      4: typeof s?.tokenByKills?.[4] === "number" ? s.tokenByKills[4] : DEFAULT_SETTINGS.tokenByKills[4],
    },
    tokenByGens: {
      0: typeof s?.tokenByGens?.[0] === "number" ? s.tokenByGens[0] : DEFAULT_SETTINGS.tokenByGens[0],
      1: typeof s?.tokenByGens?.[1] === "number" ? s.tokenByGens[1] : DEFAULT_SETTINGS.tokenByGens[1],
      2: typeof s?.tokenByGens?.[2] === "number" ? s.tokenByGens[2] : DEFAULT_SETTINGS.tokenByGens[2],
      3: typeof s?.tokenByGens?.[3] === "number" ? s.tokenByGens[3] : DEFAULT_SETTINGS.tokenByGens[3],
      4: typeof s?.tokenByGens?.[4] === "number" ? s.tokenByGens[4] : DEFAULT_SETTINGS.tokenByGens[4],
      5: typeof s?.tokenByGens?.[5] === "number" ? s.tokenByGens[5] : DEFAULT_SETTINGS.tokenByGens[5],
    },
    lockThreshold: s?.lockThreshold === 1 || s?.lockThreshold === 2 ? s.lockThreshold : DEFAULT_SETTINGS.lockThreshold,
    tierBaseCosts: {
      "S+": typeof s?.tierBaseCosts?.["S+"] === "number" ? s.tierBaseCosts["S+"] : DEFAULT_SETTINGS.tierBaseCosts["S+"],
      "S": typeof s?.tierBaseCosts?.["S"] === "number" ? s.tierBaseCosts["S"] : DEFAULT_SETTINGS.tierBaseCosts["S"],
      "A": typeof s?.tierBaseCosts?.["A"] === "number" ? s.tierBaseCosts["A"] : DEFAULT_SETTINGS.tierBaseCosts["A"],
      "B": typeof s?.tierBaseCosts?.["B"] === "number" ? s.tierBaseCosts["B"] : DEFAULT_SETTINGS.tierBaseCosts["B"],
      "C": typeof s?.tierBaseCosts?.["C"] === "number" ? s.tierBaseCosts["C"] : DEFAULT_SETTINGS.tierBaseCosts["C"],
      "Special/New": typeof s?.tierBaseCosts?.["Special/New"] === "number" ? s.tierBaseCosts["Special/New"] : DEFAULT_SETTINGS.tierBaseCosts["Special/New"],
    },
    killerTierOverrides: s?.killerTierOverrides && typeof s.killerTierOverrides === "object" ? s.killerTierOverrides : {},
    winTargetBalance: typeof s?.winTargetBalance === "number" && s.winTargetBalance >= 0 ? s.winTargetBalance : DEFAULT_SETTINGS.winTargetBalance,
    winByUnlockAll: typeof s?.winByUnlockAll === "boolean" ? s.winByUnlockAll : DEFAULT_SETTINGS.winByUnlockAll,
  };
}

export function getInitialSession(): Session {
  const now = new Date().toISOString();
  const settings = DEFAULT_SETTINGS;
  return {
    tokenBalance: INITIAL_TOKEN_BALANCE,
    killers: buildInitialKillers(settings),
    matchHistory: [],
    settings,
    createdAt: now,
    updatedAt: now,
    wonAt: null,
  };
}

/** Empty run with given settings (for replay after delete). */
export function getEmptyRun(settings: Settings): Omit<Session, "createdAt" | "updatedAt" | "wonAt"> {
  return {
    tokenBalance: INITIAL_TOKEN_BALANCE,
    killers: buildInitialKillers(settings),
    matchHistory: [],
    settings,
  };
}

/** Apply settings to existing killers (tier, baseCost, currentCost); keeps progress. */
function applySettingsToKillers(killers: KillerState[], settings: Settings): KillerState[] {
  return killers.map((k) => {
    const tier = effectiveTier(k.id, k.tier, settings.killerTierOverrides);
    const baseCost = tierCost(tier, settings.tierBaseCosts);
    const currentCost = Math.max(k.currentCost, baseCost);
    return { ...k, tier, baseCost, currentCost };
  });
}

/** Reset progress only: clear match history, balance, unlocks; keep settings. */
export function resetProgress(session: Session): Session {
  const now = new Date().toISOString();
  return {
    ...session,
    tokenBalance: INITIAL_TOKEN_BALANCE,
    killers: buildInitialKillers(session.settings),
    matchHistory: [],
    updatedAt: now,
    wonAt: null,
  };
}

/** Reset settings to defaults only; keep match history, balance, killer progress. */
export function resetSettings(session: Session): Session {
  const defaultSettings = DEFAULT_SETTINGS;
  return {
    ...session,
    settings: defaultSettings,
    killers: applySettingsToKillers(session.killers, defaultSettings),
    updatedAt: new Date().toISOString(),
  };
}

export function exportSessionToJson(session: Session): string {
  const withGenStats = { ...session, genStats: getSessionGenStats(session) };
  return JSON.stringify(withGenStats, null, 2);
}

/** Normalize imported session so it has all killers and valid fields. */
function normalizeImportedSession(parsed: Session): Session {
  const settings = normalizeSettings(parsed);
  const savedById = new Map((parsed.killers ?? []).map((k) => [k.id, k]));
  const killers: KillerState[] = KILLER_DEFINITIONS.map((def) => {
    const tier = effectiveTier(def.id, def.tier, settings.killerTierOverrides);
    const baseCost = tierCost(tier, settings.tierBaseCosts);
    const saved = savedById.get(def.id);
    if (saved) {
      const savedCost = typeof saved.currentCost === "number" ? saved.currentCost : baseCost;
      const currentCost = Math.max(savedCost, baseCost);
      return {
        id: def.id,
        name: def.name,
        tier,
        baseCost,
        currentCost,
        status: saved.status === "Unlocked" ? "Unlocked" : saved.status === "Dead" ? "Dead" : "Locked",
        matchesPlayed: typeof saved.matchesPlayed === "number" ? saved.matchesPlayed : 0,
        totalKills: typeof saved.totalKills === "number" ? saved.totalKills : 0,
        lossCount: typeof saved.lossCount === "number" ? saved.lossCount : 0,
      };
    }
    return {
      id: def.id,
      name: def.name,
      tier,
      baseCost,
      currentCost: baseCost,
      status: "Locked",
      matchesPlayed: 0,
      totalKills: 0,
      lossCount: 0,
    };
  });
  const matchHistory = Array.isArray(parsed.matchHistory)
    ? (parsed.matchHistory as MatchRecord[]).filter(
        (m) =>
          m &&
          typeof m.kills === "number" &&
          typeof m.tokensEarned === "number" &&
          m.timestamp
      )
    : [];
  const normalized: Session = {
    tokenBalance: typeof parsed.tokenBalance === "number" ? parsed.tokenBalance : INITIAL_TOKEN_BALANCE,
    killers: killers.sort((a, b) => a.name.localeCompare(b.name)),
    matchHistory,
    settings,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wonAt: typeof parsed.wonAt === "string" ? parsed.wonAt : null,
  };
  normalized.genStats = getSessionGenStats(normalized);
  return normalized;
}

export function importSessionFromJson(json: string): Session | null {
  try {
    const parsed = JSON.parse(json) as Session;
    if (typeof parsed.tokenBalance !== "number" && typeof parsed.tokenBalance !== "undefined") return null;
    return normalizeImportedSession(parsed);
  } catch {
    return null;
  }
}

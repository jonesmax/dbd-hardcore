export type Tier = "S+" | "S" | "A" | "B" | "C" | "Special/New";

export interface KillerDefinition {
  id: string;
  name: string;
  tier: Tier;
  baseCost: number;
}

export interface KillerState {
  id: string;
  name: string;
  tier: Tier;
  baseCost: number;
  currentCost: number;
  status: "Locked" | "Unlocked" | "Dead";
  matchesPlayed: number;
  totalKills: number;
  lossCount: number;
}

export type MatchResult = "Win" | "Neutral" | "Loss";

export interface MatchRecord {
  id: string;
  killerId: string;
  killerName: string;
  kills: number;
  result: MatchResult;
  tokensEarned: number;
  timestamp: string;
  killerLockedAfter: boolean;
  /** Gens standing at end of game (0–5). Optional for legacy records. */
  gensStanding?: number;
  /** Token balance after this match. */
  balanceAfter?: number;
}

/** Session log: unlock and dead only. Matches live in matchHistory. */
export type LogKind = "unlock" | "dead";

export interface LogEntryUnlockPayload {
  id: string;
  killerId: string;
  killerName: string;
  cost: number;
}

export interface LogEntryDeadPayload {
  id: string;
  killerId: string;
  killerName: string;
  matchId?: string;
}

export type LogEntryPayload = LogEntryUnlockPayload | LogEntryDeadPayload;

export interface LogEntry {
  id: string;
  kind: LogKind;
  timestamp: string;
  balanceAfter: number;
  payload: LogEntryPayload;
}

/** User-editable: token change per kill count (0-4). */
export type TokenByKills = Record<number, number>;

/** Token bonus/penalty per gens standing at end of game (0–5). */
export type TokenByGens = Record<number, number>;

/** 1 = lock only on 0-1 kills; 2 = lock on 0-2 kills (incl. neutral). */
export type LockThreshold = 1 | 2;

/** User-editable: base cost per tier. */
export type TierBaseCosts = Record<Tier, number>;

/** Per-killer tier override (cost is always from tier). */
export type KillerTierOverrides = Record<string, Tier>;

export interface Settings {
  tokenByKills: TokenByKills;
  tokenByGens: TokenByGens;
  lockThreshold: LockThreshold;
  tierBaseCosts: TierBaseCosts;
  killerTierOverrides: KillerTierOverrides;
  /** Win by reaching this token balance (0 = disabled). */
  winTargetBalance: number;
  /** Win by unlocking all killers. */
  winByUnlockAll: boolean;
}

/** Session-level gen stats (persisted in JSON, computed from match log entries). */
export interface SessionGenStats {
  matchesWithGens: number;
  totalGensStanding: number;
  avgGensStanding: number;
}

export interface Session {
  tokenBalance: number;
  killers: KillerState[];
  matchHistory: MatchRecord[];
  /** Log for unlock + dead only. Timeline merges matchHistory + logEntries. */
  logEntries: LogEntry[];
  settings: Settings;
  createdAt: string;
  updatedAt: string;
  /** Set when a win condition is met (ISO timestamp). */
  wonAt?: string | null;
  /** Gen stats for this session (included in JSON export). */
  genStats?: SessionGenStats;
}

export const TIER_ORDER: Tier[] = ["S+", "S", "A", "B", "C", "Special/New"];

export const DEFAULT_TOKEN_BY_KILLS: TokenByKills = {
  0: -4,
  1: -1,
  2: 0,
  3: 4,
  4: 6,
};

/** 5 gens = +3, 4 = +2, 3 = +1, 2 = +1, 1 = 0, 0 = -1 */
export const DEFAULT_TOKEN_BY_GENS: TokenByGens = {
  0: -1,
  1: 0,
  2: 1,
  3: 1,
  4: 2,
  5: 3,
};

export const DEFAULT_TIER_BASE_COSTS: TierBaseCosts = {
  "S+": 12,
  "S": 10,
  "A": 8,
  "B": 6,
  "C": 5,
  "Special/New": 8,
};

export const DEFAULT_SETTINGS: Settings = {
  tokenByKills: { ...DEFAULT_TOKEN_BY_KILLS },
  tokenByGens: { ...DEFAULT_TOKEN_BY_GENS },
  lockThreshold: 2,
  tierBaseCosts: { ...DEFAULT_TIER_BASE_COSTS },
  killerTierOverrides: {},
  winTargetBalance: 500,
  winByUnlockAll: true,
};

/** Border/theme color per tier for UI grouping. */
export const TIER_COLORS: Record<Tier, string> = {
  "S+": "#ffd700",
  "S": "#8957e5",
  "A": "#cd7f32",
  "B": "#4a90d9",
  "C": "#8b7355",
  "Special/New": "#a371f7",
};

export const INITIAL_TOKEN_BALANCE = 12;

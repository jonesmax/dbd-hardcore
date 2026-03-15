"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { getInitialSession, exportSessionToJson, importSessionFromJson, resetProgress as resetProgressSession, resetSettings as resetSettingsSession } from "@/lib/session";
import { processMatch, unlockKiller, revertMatch, deleteMatch as deleteMatchSession, editMatch as editMatchSession, getSessionGenStats, getMatchHistory } from "@/lib/gameLogic";
import { loadSession, saveSession } from "@/lib/sessionDb";
import { useAuth } from "@/context/AuthContext";

interface SessionContextValue {
  session: Session;
  setSession: (s: Session | ((prev: Session) => Session)) => void;
  playMatch: (killerId: string, kills: number, gensStanding?: number) => boolean;
  unlock: (killerId: string) => boolean;
  undoLastMatch: () => boolean;
  deleteMatch: (matchId: string) => boolean;
  editMatch: (matchId: string, updates: { killerId?: string; kills?: number; gensStanding?: number }) => boolean;
  reset: () => void;
  resetProgress: () => void;
  resetSettings: () => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [session, setSessionState] = useState<Session>(getInitialSession);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession(userId).then((loaded) => {
      if (cancelled) return;
      setSessionState(loaded ? (loaded.settings ? loaded : { ...loaded, settings: DEFAULT_SETTINGS }) : getInitialSession());
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    saveTimeoutRef.current && clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveSession(userId, session).catch(() => {});
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [userId, session]);

  const setSession = useCallback((s: Session | ((prev: Session) => Session)) => {
    setSessionState(s);
  }, []);

  const playMatch = useCallback((killerId: string, kills: number, gensStanding: number = 5): boolean => {
    setSessionState((prev) => {
      const result = processMatch(prev, killerId, kills, gensStanding);
      return result ? result.session : prev;
    });
    return true;
  }, []);

  const unlock = useCallback((killerId: string): boolean => {
    setSessionState((prev) => unlockKiller(prev, killerId) ?? prev);
    return true;
  }, []);

  const undoLastMatch = useCallback((): boolean => {
    setSessionState((prev) => {
      const matches = getMatchHistory(prev);
      if (matches.length === 0) return prev;
      return revertMatch(prev, matches[0]);
    });
    return true;
  }, []);

  const deleteMatch = useCallback((matchId: string): boolean => {
    setSessionState((prev) => deleteMatchSession(prev, matchId) ?? prev);
    return true;
  }, []);

  const editMatch = useCallback((matchId: string, updates: { killerId?: string; kills?: number; gensStanding?: number }): boolean => {
    setSessionState((prev) => {
      const next = editMatchSession(prev, matchId, updates) ?? prev;
      if (next !== prev) saveSession(userId, next).catch(() => {});
      return next;
    });
    return true;
  }, [userId]);

  const reset = useCallback(() => {
    const initial = getInitialSession();
    setSessionState(initial);
    saveSession(userId, initial).catch(() => {});
  }, [userId]);

  const resetProgress = useCallback(() => {
    setSessionState((prev) => {
      const next = resetProgressSession(prev);
      saveSession(userId, next).catch(() => {});
      return next;
    });
  }, [userId]);

  const resetSettings = useCallback(() => {
    setSessionState((prev) => {
      const next = resetSettingsSession(prev);
      saveSession(userId, next).catch(() => {});
      return next;
    });
  }, [userId]);

  const exportJson = useCallback(() => exportSessionToJson(session), [session]);
  const importJson = useCallback((json: string) => {
    const next = importSessionFromJson(json);
    if (next) {
      setSessionState(next);
      saveSession(userId, next).catch(() => {});
      return true;
    }
    return false;
  }, [userId]);

  const value: SessionContextValue = {
    session,
    setSession,
    playMatch,
    unlock,
    undoLastMatch,
    deleteMatch,
    editMatch,
    reset,
    resetProgress,
    resetSettings,
    exportJson,
    importJson,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

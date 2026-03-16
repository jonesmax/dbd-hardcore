"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { getInitialSession, ensureSessionComplete, resetProgress as resetProgressSession, resetSettings as resetSettingsSession } from "@/lib/session";
import { processMatch, unlockKiller, revertMatch, deleteMatch as deleteMatchSession, editMatch as editMatchSession, getSessionGenStats, getMatchHistory } from "@/lib/gameLogic";
import { loadSession, saveSession } from "@/lib/sessionDb";
import { useAuth } from "@/context/AuthContext";

interface SessionContextValue {
  session: Session;
  /** False only after first load has completed for current user. Do not render session UI until true. */
  sessionReady: boolean;
  setSession: (s: Session | ((prev: Session) => Session)) => void;
  playMatch: (killerId: string, kills: number, gensStanding?: number) => boolean;
  unlock: (killerId: string) => boolean;
  undoLastMatch: () => boolean;
  deleteMatch: (matchId: string) => boolean;
  editMatch: (matchId: string, updates: { killerId?: string; kills?: number; gensStanding?: number }) => boolean;
  reset: () => void;
  resetProgress: () => void;
  resetSettings: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [session, setSessionState] = useState<Session>(getInitialSession);
  const [sessionReady, setSessionReady] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadedUserIdRef.current = null;
    setSessionReady(false);
    loadSession(userId).then((loaded) => {
      if (cancelled) return;
      loadedUserIdRef.current = userId;
      const withSettings = loaded ? (loaded.settings ? loaded : { ...loaded, settings: DEFAULT_SETTINGS }) : null;
      setSessionState(withSettings ? ensureSessionComplete(withSettings) : getInitialSession());
      setSessionReady(true);
    }).catch(() => {
      if (!cancelled) {
        loadedUserIdRef.current = userId;
        setSessionReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current !== userId) return;
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

  const persist = useCallback((next: Session, opts?: { clearProgress?: boolean }) => {
    saveSession(userId, next, opts).catch(() => {});
  }, [userId]);

  const playMatch = useCallback((killerId: string, kills: number, gensStanding: number = 5): boolean => {
    setSessionState((prev) => {
      const result = processMatch(prev, killerId, kills, gensStanding);
      if (result) {
        persist(result.session);
        return result.session;
      }
      return prev;
    });
    return true;
  }, [persist]);

  const unlock = useCallback((killerId: string): boolean => {
    setSessionState((prev) => {
      const next = unlockKiller(prev, killerId);
      if (next) {
        persist(next);
        return next;
      }
      return prev;
    });
    return true;
  }, [persist]);

  const undoLastMatch = useCallback((): boolean => {
    setSessionState((prev) => {
      const matches = getMatchHistory(prev);
      if (matches.length === 0) return prev;
      const next = revertMatch(prev, matches[0]);
      if (next !== prev) persist(next);
      return next;
    });
    return true;
  }, [persist]);

  const deleteMatch = useCallback((matchId: string): boolean => {
    setSessionState((prev) => {
      const next = deleteMatchSession(prev, matchId);
      if (next) persist(next);
      return next ?? prev;
    });
    return true;
  }, [persist]);

  const editMatch = useCallback((matchId: string, updates: { killerId?: string; kills?: number; gensStanding?: number }): boolean => {
    setSessionState((prev) => {
      const next = editMatchSession(prev, matchId, updates) ?? prev;
      if (next !== prev) persist(next);
      return next;
    });
    return true;
  }, [persist]);

  const reset = useCallback(() => {
    const initial = getInitialSession();
    setSessionState(initial);
    persist(initial, { clearProgress: true });
  }, [persist]);

  const resetProgress = useCallback(() => {
    setSessionState((prev) => {
      const next = resetProgressSession(prev);
      persist(next, { clearProgress: true });
      return next;
    });
  }, [persist]);

  const resetSettings = useCallback(() => {
    setSessionState((prev) => {
      const next = resetSettingsSession(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const value: SessionContextValue = {
    session,
    sessionReady,
    setSession,
    playMatch,
    unlock,
    undoLastMatch,
    deleteMatch,
    editMatch,
    reset,
    resetProgress,
    resetSettings,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

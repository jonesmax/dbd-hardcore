import type { Session } from "@/types";
import { supabase, hasSupabase } from "@/lib/supabase";
import { importSessionFromJson } from "@/lib/session";
import { getSessionGenStats } from "@/lib/gameLogic";

const SESSION_KEY = "dbd-hardcore-session";

/** Load session for the given user (Supabase) or from localStorage when no Supabase/user. */
export async function loadSession(userId: string | null): Promise<Session | null> {
  if (hasSupabase && supabase && userId) {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.data) return null;
    const parsed = data.data as Record<string, unknown>;
    const normalized = importSessionFromJson(JSON.stringify(parsed));
    return normalized;
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

/** Save session for the given user (Supabase) or to localStorage when no Supabase/user. */
export async function saveSession(userId: string | null, session: Session): Promise<void> {
  const toSave = { ...session, genStats: getSessionGenStats(session) };
  if (hasSupabase && supabase && userId) {
    await supabase.from("sessions").upsert(
      { user_id: userId, data: toSave, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
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

import type { Session } from "@/types";
import { supabase, hasSupabase } from "@/lib/supabase";
import { importSessionFromJson } from "@/lib/session";
import { getSessionGenStats } from "@/lib/gameLogic";

const SESSION_KEY = "dbd-killer-economy-session";

/** Load session from Supabase or localStorage (fallback when Supabase not configured). */
export async function loadSession(): Promise<Session | null> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .select("data")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data?.data) return null;
    const parsed = data.data as Record<string, unknown>;
    const normalized = importSessionFromJson(JSON.stringify(parsed));
    return normalized;
  }
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (!raw) return null;
    return importSessionFromJson(raw);
  } catch {
    return null;
  }
}

/** Save session to Supabase or localStorage. */
export async function saveSession(session: Session): Promise<void> {
  const toSave = { ...session, genStats: getSessionGenStats(session) };
  if (hasSupabase && supabase) {
    await supabase.from("sessions").upsert(
      { id: "default", data: toSave, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    return;
  }
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    }
  } catch {
    // ignore
  }
}

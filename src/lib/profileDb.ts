import { supabase } from "@/lib/supabase";

export async function loadUsername(userId: string | null): Promise<string | null> {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.username ?? null;
}

export async function saveUsername(userId: string, username: string | null): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Not configured" };
  const raw = username?.trim() || null;
  if (raw !== null && (raw.length < 2 || raw.length > 30)) {
    return { error: "Username must be 2–30 characters" };
  }
  if (raw !== null && !/^[a-zA-Z0-9_-]+$/.test(raw)) {
    return { error: "Only letters, numbers, _ and -" };
  }
  const trimmed = raw === null ? null : raw.toLowerCase();
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, username: trimmed }, { onConflict: "user_id" });
  if (error) {
    if (error.code === "23505") return { error: "Username is already taken" };
    return { error: error.message };
  }
  return { error: null };
}

/** Check if a username is taken by another user (exclude current userId). */
export async function isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
  if (!supabase) return false;
  const lower = username.trim().toLowerCase();
  if (!lower) return false;
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("username", lower)
    .limit(1)
    .maybeSingle();
  return data != null && data.user_id !== excludeUserId;
}

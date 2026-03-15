"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, hasSupabase } from "@/lib/supabase";
import { loadUsername, saveUsername } from "@/lib/profileDb";

interface AuthContextValue {
  user: User | null;
  profile: { username: string | null };
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateUsername: (username: string | null) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string | null }>({ username: null });
  const [loading, setLoading] = useState(!!hasSupabase);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const username = await loadUsername(user.id);
    setProfile({ username });
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile({ username: null });
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.id) loadProfile();
  }, [user?.id, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase not configured") };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const updateUsername = useCallback(async (username: string | null): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: "Not signed in" };
    const result = await saveUsername(user.id, username);
    if (!result.error) await loadProfile();
    return result;
  }, [user?.id, loadProfile]);

  const value: AuthContextValue = { user, profile, loading, signIn, signUp, signOut, loadProfile, updateUsername };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

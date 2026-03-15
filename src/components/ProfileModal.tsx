"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isUsernameTaken } from "@/lib/profileDb";

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, profile, updateUsername } = useAuth();
  const [usernameInput, setUsernameInput] = useState(profile.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  useEffect(() => {
    setUsernameInput(profile.username ?? "");
  }, [profile.username]);

  async function handleSaveUsername() {
    if (!user?.id) return;
    setUsernameError(null);
    const raw = usernameInput.trim().toLowerCase() || null;
    if (raw && raw.length < 2) {
      setUsernameError("At least 2 characters");
      return;
    }
    if (raw && !/^[a-zA-Z0-9_-]+$/.test(raw)) {
      setUsernameError("Only letters, numbers, _ and -");
      return;
    }
    const taken = raw ? await isUsernameTaken(raw, user.id) : false;
    if (taken) {
      setUsernameError("Username is already taken");
      return;
    }
    setUsernameSaving(true);
    const { error } = await updateUsername(raw || null);
    setUsernameSaving(false);
    if (error) setUsernameError(error);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            ✕
          </button>
        </div>
        {user && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Display name</h3>
            <p className="mb-2 text-xs text-[var(--muted)]">
              Optional; shown in the header. 2–30 characters, letters, numbers, _ and -. Must be unique.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setUsernameError(null);
                }}
                placeholder="Username (optional)"
                className="w-48 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
                maxLength={30}
              />
              <button
                type="button"
                onClick={handleSaveUsername}
                disabled={usernameSaving}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {usernameSaving ? "Saving…" : "Save name"}
              </button>
            </div>
            {usernameError && <p className="mt-1 text-xs text-[var(--danger)]">{usernameError}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

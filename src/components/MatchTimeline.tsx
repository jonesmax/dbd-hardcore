"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { EditMatchModal } from "@/components/EditMatchModal";
import type { MatchRecord, LogEntry, LogEntryUnlockPayload, LogEntryDeadPayload } from "@/types";
import { killerImageSrc } from "@/lib/assetPath";

function shortDate(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type TimelineItem =
  | { type: "match"; data: MatchRecord }
  | { type: "unlock"; entry: LogEntry & { kind: "unlock"; payload: LogEntryUnlockPayload } }
  | { type: "dead"; entry: LogEntry & { kind: "dead"; payload: LogEntryDeadPayload } };

interface MatchItemProps {
  m: MatchRecord;
  onDelete: (matchId: string) => void;
  onEditClick: (match: MatchRecord) => void;
}

function MatchTimelineItem({ m, onDelete, onEditClick }: MatchItemProps) {
  const [imgError, setImgError] = useState(false);
  const isPositive = m.tokensEarned >= 0;
  const borderColor = isPositive ? "var(--success)" : "var(--danger)";
  const tokenClass = isPositive ? "text-[var(--success)]" : "text-[var(--danger)]";

  return (
    <div
      className="relative flex gap-2 rounded-r-lg border-l-4 border-t border-r border-b border-[var(--border)] bg-[var(--surface)] py-2 pl-2 pr-2"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--background)]">
        {imgError ? (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--muted)]">
            {m.killerName.charAt(0)}
          </span>
        ) : (
          <img
            src={killerImageSrc(m.killerId)}
            alt=""
            className="h-full w-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-[var(--foreground)]" title={m.killerName}>
            {m.killerName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[var(--muted)]">{shortDate(m.timestamp)}</span>
            <button type="button" onClick={() => onEditClick(m)} className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-hover)]" title="Edit match">✎</button>
            <button type="button" onClick={() => confirm("Delete this match?") && onDelete(m.id)} className="rounded p-0.5 text-[var(--danger)] hover:bg-[var(--danger-bg)]" title="Delete match">✕</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="text-[var(--muted)]">{m.kills} kill{m.kills !== 1 ? "s" : ""}</span>
          {m.gensStanding !== undefined && (
            <span className="text-[var(--muted)]">{m.gensStanding} gen{m.gensStanding !== 1 ? "s" : ""}</span>
          )}
          <span className={tokenClass}>
            {m.tokensEarned >= 0 ? `+${m.tokensEarned}` : m.tokensEarned} tokens
          </span>
          {m.killerLockedAfter && (
            <span className="rounded bg-[var(--danger-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--danger)]">
              Dead
            </span>
          )}
          <span className="text-[var(--muted)]">Balance after: {m.balanceAfter ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

function UnlockTimelineItem({ entry }: { entry: LogEntry & { kind: "unlock"; payload: LogEntryUnlockPayload } }) {
  const [imgError, setImgError] = useState(false);
  const p = entry.payload;
  return (
    <div
      className="relative flex gap-2 rounded-r-lg border-l-4 border-t border-r border-b border-[var(--border)] bg-[var(--surface)] py-2 pl-2 pr-2"
      style={{ borderLeftColor: "var(--accent)" }}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--background)]">
        {imgError ? (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--muted)]">
            {p.killerName.charAt(0)}
          </span>
        ) : (
          <img
            src={killerImageSrc(p.killerId)}
            alt=""
            className="h-full w-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-[var(--foreground)]" title={p.killerName}>
            Unlocked {p.killerName}
          </span>
          <span className="text-[10px] text-[var(--muted)]">{shortDate(entry.timestamp)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
          <span>−{p.cost} tokens</span>
          <span>Balance after: {entry.balanceAfter}</span>
        </div>
      </div>
    </div>
  );
}

function DeadTimelineItem({ entry }: { entry: LogEntry & { kind: "dead"; payload: LogEntryDeadPayload } }) {
  const [imgError, setImgError] = useState(false);
  const p = entry.payload;
  return (
    <div
      className="relative flex gap-2 rounded-r-lg border-l-4 border-t border-r border-b border-[var(--border)] bg-[var(--surface)] py-2 pl-2 pr-2"
      style={{ borderLeftColor: "var(--danger)" }}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--background)]">
        {imgError ? (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--muted)]">
            {p.killerName.charAt(0)}
          </span>
        ) : (
          <img
            src={killerImageSrc(p.killerId)}
            alt=""
            className="h-full w-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-[var(--danger)]" title={p.killerName}>
            {p.killerName} dead
          </span>
          <span className="text-[10px] text-[var(--muted)]">{shortDate(entry.timestamp)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
          <span>Balance after: {entry.balanceAfter}</span>
        </div>
      </div>
    </div>
  );
}

export function MatchTimeline() {
  const { session, deleteMatch, editMatch } = useSession();
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);

  const entries = useMemo((): TimelineItem[] => {
    const matchItems: TimelineItem[] = session.matchHistory.map((m) => ({ type: "match" as const, data: m }));
    const logItems: TimelineItem[] = session.logEntries.map((e) =>
      e.kind === "unlock"
        ? { type: "unlock" as const, entry: e }
        : { type: "dead" as const, entry: e }
    );
    const ts = (x: TimelineItem) =>
      x.type === "match" ? new Date(x.data.timestamp).getTime() : new Date(x.entry.timestamp).getTime();
    return [...matchItems, ...logItems].sort((a, b) => ts(b) - ts(a));
  }, [session.matchHistory, session.logEntries]);

  function handleSaveEdit(updates: { killerId?: string; kills?: number; gensStanding?: number }) {
    if (!editingMatch) return;
    editMatch(editingMatch.id, updates);
    setEditingMatch(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <h3 className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Timeline
      </h3>
      <div className="flex-1 overflow-y-auto p-2">
        {entries.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--muted)]">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((item) => {
              if (item.type === "match") {
                return (
                  <MatchTimelineItem
                    key={item.data.id}
                    m={item.data}
                    onDelete={deleteMatch}
                    onEditClick={setEditingMatch}
                  />
                );
              }
              if (item.type === "unlock") {
                return <UnlockTimelineItem key={item.entry.id} entry={item.entry} />;
              }
              return <DeadTimelineItem key={item.entry.id} entry={item.entry} />;
            })}
          </div>
        )}
      </div>
      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

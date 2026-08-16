"use client";

import type { LeaderboardRow } from "@/lib/api-client";

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardTable({
  entries,
  isLive,
}: {
  entries: LeaderboardRow[];
  isLive?: boolean;
}) {
  const maxScore = Math.max(1, ...entries.map((e) => e.score));

  return (
    <div className="rounded-lg border border-border bg-surface/80">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-textMuted">
          Top Referrers
        </h2>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Live
          </span>
        )}
      </div>

      <div className="divide-y divide-border/60">
        {entries.length === 0 && (
          <p className="px-4 py-6 text-sm text-textMuted">No referrals scored yet.</p>
        )}

        {entries.map((entry) => (
          <div key={entry.participantId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-7 shrink-0 text-center text-sm text-textMuted">
              {RANK_MEDAL[entry.rank] ?? entry.rank}
            </span>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-textPrimary">{entry.name}</span>
                <span className="font-mono-num shrink-0 text-sm text-accent">{entry.score}</span>
              </div>
              <div className="mb-1 truncate text-xs text-textMuted">
                {entry.maskedPhoneNumber ?? "No phone on file"}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(entry.score / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

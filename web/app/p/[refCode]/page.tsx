"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type ParticipantStatusResponse } from "@/lib/api-client";

const POLL_MS = 6000;

function tokenStorageKey(refCode: string): string {
  return `participant_token_${refCode}`;
}

function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remainingMs === null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalSeconds, days, hours, minutes, seconds };
}

export default function ParticipantMiniDashboardPage({ params }: { params: { refCode: string } }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center px-5">
          <p className="text-sm text-textMuted">Loading your dashboard…</p>
        </main>
      }
    >
      <ParticipantMiniDashboardInner refCode={params.refCode} />
    </Suspense>
  );
}

function ParticipantMiniDashboardInner({ refCode }: { refCode: string }) {
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ParticipantStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A fresh token arrives as ?token=... right after registration; once
  // seen it's persisted so the participant can bookmark/revisit this
  // page without the query string.
  useEffect(() => {
    const queryToken = searchParams.get("token");
    if (queryToken) {
      localStorage.setItem(tokenStorageKey(refCode), queryToken);
      setToken(queryToken);
      return;
    }
    setToken(localStorage.getItem(tokenStorageKey(refCode)));
  }, [refCode, searchParams]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getMyStatus(token);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your dashboard");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadStatus();
    const interval = setInterval(() => void loadStatus(), POLL_MS);
    return () => clearInterval(interval);
  }, [token, loadStatus]);

  const countdown = useCountdown(status?.event.expiresAt ?? null);

  async function handleCopy() {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.promotionalMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — long-press the message below to copy it manually.");
    }
  }

  // No token at all (not from a fresh registration, nothing cached
  // locally) — can't authenticate, so nothing to fetch.
  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-textMuted">
          This link needs your personal access token. Open the dashboard link from your registration
          confirmation to view your stats.
        </p>
      </main>
    );
  }

  if (error && !status) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-danger">{error}</p>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center px-5">
        <p className="text-sm text-textMuted">Loading your dashboard…</p>
      </main>
    );
  }

  const isExpired = status.event.status === "EXPIRED" || (countdown?.totalSeconds ?? 1) <= 0;

  return (
    <main className="mx-auto min-h-screen max-w-sm px-5 py-8">
      <p className="text-xs uppercase tracking-widest text-accent">{status.event.name}</p>
      <h1 className="mt-1 text-xl font-semibold text-textPrimary">Your Referral Dashboard</h1>

      {/* Score & rank */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface/80 px-4 py-4 text-center">
          <p className="text-xs uppercase tracking-wide text-textMuted">Your Score</p>
          <p className="mt-1 text-3xl font-bold text-accent">{status.participant.score}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface/80 px-4 py-4 text-center">
          <p className="text-xs uppercase tracking-wide text-textMuted">Your Rank</p>
          <p className="mt-1 text-3xl font-bold text-textPrimary">
            {status.rank ? `#${status.rank}` : "—"}
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="mt-4 rounded-lg border border-border bg-surface/80 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-textMuted">
          {isExpired ? "Event Status" : "Time Remaining"}
        </p>
        {isExpired ? (
          <p className="mt-1 text-lg font-semibold text-danger">Event has ended</p>
        ) : countdown ? (
          <p className="font-mono-num mt-1 text-2xl font-semibold text-textPrimary">
            {countdown.days > 0 && `${countdown.days}d `}
            {String(countdown.hours).padStart(2, "0")}:
            {String(countdown.minutes).padStart(2, "0")}:
            {String(countdown.seconds).padStart(2, "0")}
          </p>
        ) : (
          <p className="mt-1 text-textMuted">—</p>
        )}
      </div>

      {/* Shareable link + copy button */}
      <div className="mt-6 rounded-lg border border-border bg-surface/80 px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-textMuted">Your Referral Link</p>
        <p className="font-mono-num mt-1 truncate text-sm text-textPrimary">{status.shareableLink}</p>

        <button
          onClick={handleCopy}
          disabled={isExpired}
          className="mt-3 w-full rounded-md bg-accent py-3 text-sm font-semibold text-canvas transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "Copied! ✓" : "Copy Link & Write-up"}
        </button>

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <p className="mt-3 whitespace-pre-line text-xs text-textMuted">{status.promotionalMessage}</p>
      </div>
    </main>
  );
}

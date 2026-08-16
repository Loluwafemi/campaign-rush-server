"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ClickLogsResponse, type ClickStatus, type DashboardResponse } from "@/lib/api-client";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ClickLogsTable } from "@/components/ClickLogsTable";

const DASHBOARD_POLL_MS = 5000;
const LOGS_POLL_MS = 8000;
const PAGE_SIZE = 20;

function MetricCard({ label, value, toneClass }: { label: string; value: string; toneClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/80 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`font-mono-num mt-1 text-2xl font-semibold ${toneClass ?? "text-textPrimary"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * The join link (`/join/:eventId`) is a frontend-only route — it's
 * not part of the backend API surface, so it's built from
 * `window.location.origin` here rather than pulled from any response.
 * This is the piece a host actually needs to hand out; without it,
 * there was no way for a host to get anyone into their own event.
 */
function ShareJoinLink({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${eventId}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, insecure context);
      // the URL is still visible in the field for a manual copy.
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-textMuted">Share this to get referrers</p>
        <p className="font-mono-num truncate text-sm text-textPrimary">{joinUrl}</p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-canvas transition hover:opacity-90"
      >
        {copied ? "Copied! ✓" : "Copy join link"}
      </button>
    </div>
  );
}

export default function HostEventDashboardPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [logsData, setLogsData] = useState<ClickLogsResponse | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ClickStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboard(eventId);
      setDashboard(data);
      setDashboardError(null);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, [eventId]);

  const loadLogs = useCallback(async () => {
    try {
      const data = await api.getClickLogs(eventId, {
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        participantName: debouncedSearch || undefined,
      });
      setLogsData(data);
      setLogsError(null);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Failed to load click logs");
    }
  }, [eventId, page, statusFilter, debouncedSearch]);

  // Initial load + polling. Polling stands in for true push updates
  // (SSE/WebSocket) here — swapping the interval for a subscription
  // later wouldn't require any change to the components themselves,
  // since they only consume plain props.
  useEffect(() => {
    void loadDashboard();
    const interval = setInterval(() => void loadDashboard(), DASHBOARD_POLL_MS);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  useEffect(() => {
    void loadLogs();
    const interval = setInterval(() => void loadLogs(), LOGS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadLogs]);

  if (dashboardError) {
    return <main className="p-8 text-danger">{dashboardError}</main>;
  }
  if (!dashboard) {
    return <main className="p-8 text-textMuted">Loading dashboard…</main>;
  }

  const { metrics } = dashboard;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-widest text-accent">
          {dashboard.event.status === "ACTIVE" ? "Active event" : "Expired event"}
        </p>
        <h1 className="text-2xl font-semibold text-textPrimary">{dashboard.event.name}</h1>
      </header>

      <ShareJoinLink eventId={eventId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Total Referrals" value={metrics.totalValidClicks.toLocaleString()} toneClass="text-accent" />
        <MetricCard label="Active Participants" value={metrics.totalParticipants.toLocaleString()} />
        <MetricCard
          label="Fraud / Duplicate Blocked Rate"
          value={`${(metrics.duplicateBlockedRate * 100).toFixed(1)}%`}
          toneClass="text-warn"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <LeaderboardTable entries={dashboard.leaderboard} isLive />
        </div>
        <div className="lg:col-span-2">
          {logsError && <p className="mb-3 text-sm text-danger">{logsError}</p>}
          <ClickLogsTable
            eventId={eventId}
            logs={logsData?.logs ?? []}
            total={logsData?.total ?? 0}
            page={page}
            pageSize={PAGE_SIZE}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            isLive
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchTerm}
            onPageChange={setPage}
          />
        </div>
      </div>
    </main>
  );
}

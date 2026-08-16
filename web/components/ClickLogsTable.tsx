"use client";

import type { ClickLogRow, ClickStatus } from "@/lib/api-client";

const STATUS_OPTIONS: Array<{ value: ClickStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "VALID", label: "Valid" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "BOT", label: "Bot" },
];

const STATUS_STYLES: Record<ClickStatus, string> = {
  VALID: "bg-accent/10 text-accent border-accent/30",
  DUPLICATE: "bg-warn/10 text-warn border-warn/30",
  BOT: "bg-white/5 text-textMuted border-white/10",
};

function StatusBadge({ status }: { status: ClickStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

/** Converts the currently loaded rows into a CSV file and triggers a browser download. */
function exportLogsToCsv(logs: ClickLogRow[], eventId: string) {
  const headers = ["Clicked At", "Participant", "RefCode", "Status", "IP Hash", "Country", "Referrer", "User Agent"];
  const rows = logs.map((l) => [
    l.clickedAt,
    l.participantName,
    l.refCode,
    l.status,
    l.ipHash,
    l.country ?? "",
    l.referrer ?? "",
    l.userAgent ?? "",
  ]);

  const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `click-logs-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ClickLogsTable({
  eventId,
  logs,
  total,
  page,
  pageSize,
  statusFilter,
  searchTerm,
  isLive,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
}: {
  eventId: string;
  logs: ClickLogRow[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: ClickStatus | "ALL";
  searchTerm: string;
  isLive?: boolean;
  onStatusFilterChange: (status: ClickStatus | "ALL") => void;
  onSearchChange: (term: string) => void;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-lg border border-border bg-surface/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-textMuted">
            Click &amp; Event Logs
          </h2>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Live
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by referrer name…"
            className="rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent"
          />

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as ClickStatus | "ALL")}
            className="rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportLogsToCsv(logs, eventId)}
            disabled={logs.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-canvas transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Referrer</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">IP Hash</th>
              <th className="px-4 py-2 font-medium">Country</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-textMuted">
                  No click events match the current filters.
                </td>
              </tr>
            )}
            {logs.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 font-mono-num text-xs text-textMuted">
                  {new Date(row.clickedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-textPrimary">{row.participantName}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2 font-mono-num text-xs text-textMuted" title={row.ipHash}>
                  {row.ipHash.slice(0, 10)}…
                </td>
                <td className="px-4 py-2 text-textMuted">{row.country ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-textMuted">
        <span>
          Page {page} of {totalPages} · {total.toLocaleString()} total events
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type EventSummary } from "@/lib/api-client";

export default function HostLandingPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("referral_token")) {
      router.push("/login");
      return;
    }
    api
      .listEvents()
      .then((res) => setEvents(res.events))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your events"));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("referral_token");
    router.push("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-textPrimary">Your events</h1>
        <Link
          href="/host/events/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90"
        >
          + New event
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {events === null && !error && <p className="mt-6 text-sm text-textMuted">Loading…</p>}

      {events?.length === 0 && (
        <p className="mt-6 text-sm text-textMuted">
          No events yet — create your first one to get a shareable join link.
        </p>
      )}

      <div className="mt-6 space-y-2">
        {events?.map((event) => (
          <Link
            key={event.id}
            href={`/host/dashboard/${event.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface/80 px-4 py-3 transition hover:border-accent"
          >
            <div>
              <p className="text-sm font-medium text-textPrimary">{event.name}</p>
              <p className="text-xs text-textMuted">
                {event.status === "ACTIVE" ? "Active" : "Expired"} · created{" "}
                {new Date(event.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                event.status === "ACTIVE"
                  ? "bg-accent/10 text-accent"
                  : "bg-white/5 text-textMuted"
              }`}
            >
              {event.status}
            </span>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="mt-8 text-xs text-textMuted hover:text-textPrimary">
        Sign out
      </button>
    </main>
  );
}

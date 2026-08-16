"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type PublicEvent } from "@/lib/api-client";

export default function JoinEventPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const { eventId } = params;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getPublicEvent(eventId)
      .then(setEvent)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Event not found"));
  }, [eventId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await api.registerParticipant(eventId, name, phoneNumber);
      // Hand off to the participant's own mini-dashboard, carrying the
      // access token as a one-time query param — the page itself
      // persists it to localStorage on first load (see /p/:refCode).
      router.push(
        `/p/${result.participant.refCode}?token=${encodeURIComponent(result.dashboardAccessToken)}`
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-danger">{loadError}</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center px-5">
        <p className="text-sm text-textMuted">Loading…</p>
      </main>
    );
  }

  const isExpired = event.status === "EXPIRED";

  return (
    <main className="mx-auto min-h-screen max-w-sm px-5 py-10">
      {event.ogImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.ogImageUrl}
          alt=""
          className="mb-4 aspect-[1200/630] w-full rounded-lg object-cover"
        />
      )}

      <h1 className="text-xl font-semibold text-textPrimary">{event.name}</h1>
      {event.description && <p className="mt-2 text-sm text-textMuted">{event.description}</p>}

      {isExpired ? (
        <div className="mt-6 rounded-lg border border-border bg-surface/80 px-4 py-4 text-center">
          <p className="text-sm text-danger">This event has ended — registration is closed.</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-border bg-surface/80 p-5"
        >
          <p className="text-xs uppercase tracking-wide text-textMuted">
            Register to get your own referral link
          </p>

          <div>
            <label className="mb-1 block text-xs text-textMuted">Your name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-textMuted">Phone number</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+15551234567"
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent"
            />
          </div>

          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent py-3 text-sm font-semibold text-canvas transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Getting your link…" : "Get my referral link"}
          </button>
        </form>
      )}
    </main>
  );
}

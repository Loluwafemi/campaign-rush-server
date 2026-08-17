"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { FormField } from "@/components/ui/FormField";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetGroupUrl, setTargetGroupUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [durationValue, setDurationValue] = useState(48);
  const [durationUnit, setDurationUnit] = useState<"hours" | "days">("hours");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const event = await api.createEvent({
        name,
        description: description || undefined,
        targetGroupUrl,
        ogImageUrl: ogImageUrl || undefined,
        duration: { value: durationValue, unit: durationUnit },
      });
      router.push(`/host/dashboard/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-accent">New event</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-textPrimary">Launch a referral event</h1>
        <Link href="/host/templates" className="shrink-0 text-xs text-accent hover:underline">
          Browse templates →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-border bg-surface/80 p-6">
        <FormField
          label="Event name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Launch Week Group Growth"
        />
        <FormField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Join our community before the timer runs out."
        />
        <FormField
          label="Target group URL"
          type="url"
          required
          value={targetGroupUrl}
          onChange={(e) => setTargetGroupUrl(e.target.value)}
          placeholder="https://chat.whatsapp.com/your-invite-code"
        />
        <FormField
          label="Cover image URL (optional)"
          type="url"
          value={ogImageUrl}
          onChange={(e) => setOgImageUrl(e.target.value)}
          placeholder="https://example.com/cover.png"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <FormField
              label="Duration"
              type="number"
              min={1}
              required
              value={durationValue}
              onChange={(e) => setDurationValue(Number(e.target.value))}
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs text-textMuted">Unit</label>
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as "hours" | "days")}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent"
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-canvas transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}

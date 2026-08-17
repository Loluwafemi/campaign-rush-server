import Link from "next/link";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { eventTemplates } from "@/lib/event-templates";

export default function EventTemplatesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">Templates</p>
          <h1 className="mt-1 text-2xl font-semibold text-textPrimary">
            Starting points for your next event
          </h1>
          <p className="mt-2 max-w-xl text-sm text-textMuted">
            Copy any field straight into the create-event form. Duration is a suggestion tuned to
            that category — shorter for launch-day urgency, longer for steady acquisition.
          </p>
        </div>
        <Link
          href="/host/events/new"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90"
        >
          + New event
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {eventTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </main>
  );
}

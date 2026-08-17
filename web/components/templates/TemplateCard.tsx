import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyField } from "@/components/templates/CopyField";
import type { EventTemplate } from "@/lib/event-templates";

export function TemplateCard({ template }: { template: EventTemplate }) {
  const { fields } = template;

  return (
    <div className="rounded-lg border border-border bg-surface/80 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {template.category}
          </span>
          <h2 className="mt-2 text-lg font-semibold text-textPrimary">{template.title}</h2>
        </div>
        <Link
          href="/host/events/new"
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-textPrimary transition hover:border-accent"
        >
          Use this <ArrowUpRight size={12} />
        </Link>
      </div>

      <p className="mt-3 text-sm italic leading-relaxed text-textMuted">{template.rationale}</p>

      <div className="mt-4 space-y-4">
        <CopyField label="Event name" value={fields.name} />
        <CopyField label="Description" value={fields.description} multiline />
        <CopyField
          label="Target group URL"
          value={fields.targetUrlExample}
          helperText={fields.targetUrlLabel}
        />
        <div className="grid grid-cols-2 gap-4">
          <CopyField label="Duration (value)" value={fields.durationNumber} helperText={fields.durationNote} />
          <CopyField label="Duration (unit)" value={fields.durationUnit} />
        </div>
        <CopyField label="Cover image guidance" value={fields.coverImageTip} multiline />
      </div>
    </div>
  );
}

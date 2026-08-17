"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({
  label,
  value,
  helperText,
  multiline,
}: {
  label: string;
  value: string;
  helperText?: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (permissions, insecure context) —
      // the value is still visible in the field for a manual copy.
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-textMuted">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-textMuted transition hover:text-accent"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <p
        className={`rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textPrimary ${
          multiline ? "leading-relaxed" : "truncate"
        }`}
      >
        {value}
      </p>
      {helperText && <p className="mt-1 text-xs text-textMuted">{helperText}</p>}
    </div>
  );
}

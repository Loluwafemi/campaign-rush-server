import type { InputHTMLAttributes } from "react";

export function FormField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-textMuted">{label}</label>
      <input
        className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent"
        {...props}
      />
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

export function EditorFieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">
      {children}
    </label>
  );
}

export function EditorTextInput({
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
    />
  );
}

export function EditorHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-amber-800">{children}</p>;
}

export function EditorSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">{children}</h4>
  );
}

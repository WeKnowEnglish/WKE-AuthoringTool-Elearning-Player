import type { TeacherLexiconEntryKind } from "./types";

const KIND_VALUES = new Set<TeacherLexiconEntryKind>([
  "word",
  "phrase",
  "slang",
  "name",
  "other",
]);

/** Normalize surface for identity / dedupe (phrases keep spaces). */
export function normalizeLexiconSurface(surface: string): string {
  return surface.trim().toLowerCase().replace(/\s+/g, " ");
}

export function inferEntryKind(surface: string, explicit?: TeacherLexiconEntryKind | null): TeacherLexiconEntryKind {
  if (explicit && KIND_VALUES.has(explicit)) return explicit;
  const normalized = normalizeLexiconSurface(surface);
  if (normalized.includes(" ")) return "phrase";
  return "word";
}

export function createTeacherLexiconId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `tw_${hex}`;
}

export function slugHintFromSurface(surface: string): string {
  return normalizeLexiconSurface(surface)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

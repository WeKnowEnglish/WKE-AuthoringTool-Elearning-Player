/**
 * Dev-only in-memory inbox for Studio → Lesson Player pack handoff.
 * Survives only while the LP Node process is running.
 */

export type StudioPackInboxFormat =
  | "multiple_choice"
  | "letter_mixup"
  | "flashcards"
  | "learning_track";

export type StudioPackInboxEntry = {
  id: string;
  format: StudioPackInboxFormat;
  pack: unknown;
  filename?: string;
  createdAt: number;
};

const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 40;

const globalStore = globalThis as typeof globalThis & {
  __wkeStudioPackInbox?: Map<string, StudioPackInboxEntry>;
};

function store(): Map<string, StudioPackInboxEntry> {
  if (!globalStore.__wkeStudioPackInbox) {
    globalStore.__wkeStudioPackInbox = new Map();
  }
  return globalStore.__wkeStudioPackInbox;
}

function prune(now = Date.now()): void {
  const map = store();
  for (const [id, entry] of map) {
    if (now - entry.createdAt > TTL_MS) map.delete(id);
  }
  while (map.size > MAX_ENTRIES) {
    const oldest = [...map.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (!oldest) break;
    map.delete(oldest[0]);
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function putStudioPackInbox(input: {
  format: StudioPackInboxFormat;
  pack: unknown;
  filename?: string;
}): StudioPackInboxEntry {
  prune();
  const entry: StudioPackInboxEntry = {
    id: newId(),
    format: input.format,
    pack: input.pack,
    filename: input.filename,
    createdAt: Date.now(),
  };
  store().set(entry.id, entry);
  return entry;
}

export function getStudioPackInbox(id: string): StudioPackInboxEntry | null {
  prune();
  const entry = store().get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store().delete(id);
    return null;
  }
  return entry;
}

export function playPathForInboxFormat(
  format: StudioPackInboxFormat,
  id: string,
): string {
  if (format === "multiple_choice") {
    return `/pilots/games-mc-quiz?inbox=${encodeURIComponent(id)}`;
  }
  if (format === "letter_mixup") {
    return `/pilots/games-letter-mixup?inbox=${encodeURIComponent(id)}`;
  }
  if (format === "flashcards") {
    return `/pilots/games-flashcards?inbox=${encodeURIComponent(id)}`;
  }
  if (format === "learning_track") {
    return `/pilots/learning-track?inbox=${encodeURIComponent(id)}`;
  }
  return `/pilots?inbox=${encodeURIComponent(id)}`;
}

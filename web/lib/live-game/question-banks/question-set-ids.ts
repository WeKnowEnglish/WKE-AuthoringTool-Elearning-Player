import type { SystemQuestionSetSlug } from "@/lib/live-game/question-banks/system-seed-source";

/** Stable UUIDs for system question sets (Q1 seed). */
export const LIVE_GAME_SYSTEM_SET_UUIDS: Record<SystemQuestionSetSlug, string> = {
  "grade56-adjectives": "a1000001-0000-4000-8000-000000000001",
  "daily-routines-a1": "a1000001-0000-4000-8000-000000000002",
  "school-life-a1": "a1000001-0000-4000-8000-000000000003",
  "describing-places-a1": "a1000001-0000-4000-8000-000000000004",
};

const UUID_BY_SLUG = LIVE_GAME_SYSTEM_SET_UUIDS;
const SLUG_BY_UUID = Object.fromEntries(
  Object.entries(LIVE_GAME_SYSTEM_SET_UUIDS).map(([slug, id]) => [id, slug]),
) as Record<string, SystemQuestionSetSlug>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isQuestionSetUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function resolveQuestionSetSlug(ref: string): SystemQuestionSetSlug | null {
  if (isQuestionSetUuid(ref)) {
    return SLUG_BY_UUID[ref.toLowerCase()] ?? null;
  }
  if (ref in LIVE_GAME_SYSTEM_SET_UUIDS) {
    return ref as SystemQuestionSetSlug;
  }
  return null;
}

export function resolveQuestionSetUuid(ref: string): string | null {
  if (isQuestionSetUuid(ref)) {
    return ref.toLowerCase();
  }
  const slug = resolveQuestionSetSlug(ref);
  return slug ? UUID_BY_SLUG[slug] : null;
}

/** Maps legacy slug session values to canonical uuid when possible. */
export function normalizeQuestionSetRefForSession(ref: string): string {
  return resolveQuestionSetUuid(ref) ?? ref;
}

export const DEFAULT_LIVE_GAME_QUESTION_SET_UUID =
  LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"];

/**
 * Shared challenge-prefetch constants, validity helpers, and stable cache keys.
 *
 * Prefetch lifecycle (harvest / deposit / craft):
 *   idle → debounce pending → request in flight → resolved and valid
 *                                      ↘ aborted (grace or hard)
 *                                      ↘ rejected (failed; slot removed)
 *   resolved and valid → consumed | expired | invalidated by node state
 *   resolved but near expiry → treated invalid (expiry buffer)
 *
 * Leave-grace retention keeps warm/in-flight work across brief radius exits
 * without changing click-time proximity security.
 */

export const LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS = 350;
export const LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS = 1_500;
export const LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS = 5_000;
export const LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX = 96;

/**
 * How long a completed or in-flight prefetch is retained after the visual /
 * proximity focus leaves that target. Chosen to cover brief path wobble and
 * leave/re-enter without approaching the 5s challenge expiry buffer window.
 */
export const LIVE_GAME_CHALLENGE_PREFETCH_LEAVE_GRACE_MS = 750;

/** Focused target + a small number of recent nearby targets. */
export const LIVE_GAME_CHALLENGE_PREFETCH_MAX_ENTRIES = 3;

export type ChallengePrefetchActivity = "harvest" | "deposit" | "craft";

export type ChallengePrefetchEntry<TQuestion> = {
  nodeId: string;
  challengeId: string;
  expiresAt: number;
  question: TQuestion;
  fetchedAt: number;
  /** Craft-only metadata retained with the token for warm open. */
  recipeId?: string;
  recipeLabel?: string;
  costSummary?: string;
};

export type ChallengePrefetchKeyParts = {
  roomId: string;
  activity: ChallengePrefetchActivity;
  targetId: string;
  playerId: string;
  questionBundleVersion: number | null;
  /** Required for craft; ignored for harvest/deposit keys. */
  recipeId?: string | null;
};

export type ChallengePrefetchOutcome =
  | "started"
  | "deduplicated"
  | "retained"
  | "reused_warm"
  | "reused_inflight"
  | "expired"
  | "invalidated"
  | "aborted_after_grace"
  | "aborted_session_change"
  | "failed";

export type ChallengePrefetchCancelReason =
  | "leave_grace"
  | "session_change"
  | "room_change"
  | "player_change"
  | "bundle_version_change"
  | "consumed"
  | "invalid_node"
  | "evicted"
  | "dispose"
  | "replaced_focus"
  | "failed";

export function buildChallengePrefetchKey(parts: ChallengePrefetchKeyParts): string {
  const version =
    parts.questionBundleVersion == null ? "nobundle" : String(parts.questionBundleVersion);
  if (parts.activity === "craft") {
    const recipeId = parts.recipeId && parts.recipeId.length > 0 ? parts.recipeId : "norecipe";
    return `${parts.roomId}|craft|${parts.targetId}|${recipeId}|${parts.playerId}|${version}`;
  }
  return `${parts.roomId}|${parts.activity}|${parts.targetId}|${parts.playerId}|${version}`;
}

/** Non-sensitive short fingerprint for diagnostics (not reversible to the key). */
export function hashChallengePrefetchKey(key: string): string {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function isChallengePrefetchValid(
  entry: { nodeId: string; expiresAt: number } | null | undefined,
  nodeId: string,
  now: number,
  options?: { cooldownEndsAt?: number | null; expiryBufferMs?: number },
): boolean {
  if (!entry || entry.nodeId !== nodeId) return false;
  const buffer = options?.expiryBufferMs ?? LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS;
  if (entry.expiresAt - buffer <= now) return false;
  const cooldown = options?.cooldownEndsAt;
  if (cooldown != null && cooldown > now) return false;
  return true;
}

export function canStartChallengePrefetch(
  lastPrefetchAt: number,
  now: number,
  minIntervalMs = LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS,
): boolean {
  return now - lastPrefetchAt >= minIntervalMs;
}

export function challengeRemainingValidityMs(
  expiresAt: number,
  now: number,
  expiryBufferMs = LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS,
): number {
  return Math.max(0, expiresAt - expiryBufferMs - now);
}

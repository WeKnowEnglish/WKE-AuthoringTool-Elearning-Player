export const LIVE_GAME_CHALLENGE_PREFETCH_DEBOUNCE_MS = 350;
export const LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS = 1_500;
export const LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS = 5_000;
export const LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX = 96;

export type ChallengePrefetchEntry<TQuestion> = {
  nodeId: string;
  challengeId: string;
  expiresAt: number;
  question: TQuestion;
  fetchedAt: number;
};

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

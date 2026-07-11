export const LIVE_GAME_AWARD_CLAIM_LEASE_MS = 15_000;

export function isLiveGameChallengeExpired(expiresAt: number, now = Date.now()): boolean {
  return expiresAt <= now;
}

export function canReclaimLiveGameAward(
  claimStartedAt: number | null,
  now = Date.now(),
): boolean {
  return claimStartedAt != null && now - claimStartedAt >= LIVE_GAME_AWARD_CLAIM_LEASE_MS;
}

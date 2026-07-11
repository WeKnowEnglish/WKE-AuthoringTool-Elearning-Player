/** Premium-gated live game features. Wire to billing when available. */
export function canUseUnlimitedLiveGameDuration(_userId: string): boolean {
  return false;
}

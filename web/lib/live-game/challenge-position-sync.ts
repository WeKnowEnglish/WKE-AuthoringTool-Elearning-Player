export const LIVE_GAME_POSITION_SYNC_ERROR =
  "Could not verify your position. Check your connection and try again.";

export async function requireLiveGamePositionSync(
  positionSync: Promise<boolean> | null | undefined,
): Promise<void> {
  if (positionSync && !(await positionSync)) {
    throw new Error(LIVE_GAME_POSITION_SYNC_ERROR);
  }
}

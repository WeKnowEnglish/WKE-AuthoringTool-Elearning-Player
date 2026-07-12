import "server-only";

const roomTails = new Map<string, Promise<void>>();

/** Serializes capacity-sensitive room operations handled by this application instance. */
export async function withLiveGameRoomLock<T>(roomId: string, operation: () => Promise<T>): Promise<T> {
  const previous = roomTails.get(roomId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => undefined).then(() => current);
  roomTails.set(roomId, tail);

  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (roomTails.get(roomId) === tail) roomTails.delete(roomId);
  }
}

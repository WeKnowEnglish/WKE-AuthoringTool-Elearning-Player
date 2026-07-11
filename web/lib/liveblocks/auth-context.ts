export type LiveblocksAuthRole = "host" | "player";

export type LiveblocksAuthRequest = {
  room: string;
  userId: string;
  displayName: string;
  role: LiveblocksAuthRole;
};

export function parseLiveblocksAuthRequest(body: unknown): LiveblocksAuthRequest | null {
  if (!body || typeof body !== "object") return null;
  const record = body as LiveblocksAuthRequest;
  if (typeof record.room !== "string" || record.room.trim().length === 0) return null;
  if (typeof record.userId !== "string" || record.userId.trim().length === 0) return null;
  if (typeof record.displayName !== "string" || record.displayName.trim().length === 0) {
    return null;
  }
  if (record.role !== "host" && record.role !== "player") return null;
  return {
    room: record.room.trim(),
    userId: record.userId.trim(),
    displayName: record.displayName.trim(),
    role: record.role,
  };
}

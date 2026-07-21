import { createHmac, timingSafeEqual } from "node:crypto";

export const WORD_CARDS_PLAYER_COOKIE = "wke-word-cards-player";

export type WordCardsPlayerToken = {
  roomId: string;
  joinCode: string;
  userId: string;
  displayName: string;
  role: "host" | "player";
};

function cookieSecret(): string {
  return (
    process.env.WORD_CARDS_COOKIE_SECRET ||
    process.env.VIRTUAL_CLASSROOM_COOKIE_SECRET ||
    process.env.LIVEBLOCKS_SECRET_KEY ||
    "wke-word-cards-dev-secret"
  );
}

export function encodeWordCardsPlayerToken(token: WordCardsPlayerToken): string {
  const payload = Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
  const sig = createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function decodeWordCardsPlayerToken(raw: string | null | undefined): WordCardsPlayerToken | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WordCardsPlayerToken;
    if (
      !parsed?.roomId ||
      !parsed?.joinCode ||
      !parsed?.userId ||
      !parsed?.displayName ||
      (parsed.role !== "host" && parsed.role !== "player")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function canAccessWordCardsRoom(input: {
  room: string;
  playerCookie: string | null;
}): boolean {
  const player = decodeWordCardsPlayerToken(input.playerCookie);
  return Boolean(player && player.roomId === input.room);
}

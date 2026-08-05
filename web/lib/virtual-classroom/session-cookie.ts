import { createHmac, timingSafeEqual } from "node:crypto";

export const VC_HOST_COOKIE = "wke-vc-host";
export const VC_MEMBER_COOKIE = "wke-vc-member";

/** Match httpOnly cookie maxAge used on host/join routes. */
export const VC_MEMBER_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

export type VirtualClassroomMemberToken = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  userId: string;
  displayName: string;
  role: "host" | "member";
  /** Unix ms; omit only for legacy unsigned cookies (rejected). */
  expiresAt?: number;
};

function cookieSecret(): string {
  return (
    process.env.VIRTUAL_CLASSROOM_COOKIE_SECRET ||
    process.env.LIVEBLOCKS_SECRET_KEY ||
    "wke-vc-dev-cookie-secret"
  );
}

function hmac(payload: string): string {
  return createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
}

function signaturesMatch(supplied: string, expected: string): boolean {
  try {
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Host cookie: JOINCODE.hostSecret.sig
 * Signature covers joinCode + hostSecret so forge-with-any-secret is impossible.
 */
export function formatVcHostCookie(joinCode: string, hostSecret: string): string {
  const code = joinCode.toUpperCase();
  const secret = hostSecret.trim();
  const body = `${code}.${secret}`;
  return `${body}.${hmac(body)}`;
}

export function parseVcHostCookie(
  value: string | null | undefined,
): { joinCode: string; hostSecret: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  // Signed: JOINCODE.secret.sig (secret itself has no dots — hex from randomBytes)
  if (parts.length !== 3) return null;
  const [joinCodeRaw, hostSecret, sig] = parts;
  if (!joinCodeRaw || !hostSecret || !sig) return null;
  const joinCode = joinCodeRaw.toUpperCase();
  const body = `${joinCode}.${hostSecret}`;
  if (!signaturesMatch(sig, hmac(body))) return null;
  return { joinCode, hostSecret };
}

export function vcHostMatchesJoinCode(
  cookieValue: string | null | undefined,
  joinCode: string,
): boolean {
  const parsed = parseVcHostCookie(cookieValue);
  return (
    parsed?.joinCode === joinCode.toUpperCase() && parsed.hostSecret.length > 0
  );
}

export function encodeVcMemberToken(payload: VirtualClassroomMemberToken): string {
  const body: VirtualClassroomMemberToken = {
    ...payload,
    joinCode: payload.joinCode.toUpperCase(),
    expiresAt:
      typeof payload.expiresAt === "number"
        ? payload.expiresAt
        : Date.now() + VC_MEMBER_TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${encoded}.${hmac(encoded)}`;
}

export function decodeVcMemberToken(
  value: string | null | undefined,
): VirtualClassroomMemberToken | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null;
  const encoded = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!signaturesMatch(sig, hmac(encoded))) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as VirtualClassroomMemberToken;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.joinCode !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string" ||
      (parsed.role !== "host" && parsed.role !== "member") ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }
    return {
      ...parsed,
      joinCode: parsed.joinCode.toUpperCase(),
    };
  } catch {
    return null;
  }
}

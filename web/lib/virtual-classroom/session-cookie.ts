export const VC_HOST_COOKIE = "wke-vc-host";
export const VC_MEMBER_COOKIE = "wke-vc-member";

export type VirtualClassroomMemberToken = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  userId: string;
  displayName: string;
  role: "host" | "member";
};

export function formatVcHostCookie(joinCode: string, hostSecret: string): string {
  return `${joinCode.toUpperCase()}.${hostSecret}`;
}

export function parseVcHostCookie(
  value: string | null | undefined,
): { joinCode: string; hostSecret: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null;
  return {
    joinCode: value.slice(0, dot).toUpperCase(),
    hostSecret: value.slice(dot + 1),
  };
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
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeVcMemberToken(
  value: string | null | undefined,
): VirtualClassroomMemberToken | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as VirtualClassroomMemberToken;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.joinCode !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string" ||
      (parsed.role !== "host" && parsed.role !== "member")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

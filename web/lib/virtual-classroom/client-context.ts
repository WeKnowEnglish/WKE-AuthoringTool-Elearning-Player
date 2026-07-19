"use client";

export type VirtualClassroomClientContext = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  /** Empty string for one-off sessions. */
  classId: string;
  role: "host" | "member";
  userId: string;
  displayName: string;
};

const CONTEXT_KEY = "wke-vc-session-context";

export function setVirtualClassroomContext(ctx: VirtualClassroomClientContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}

export function getVirtualClassroomContext(): VirtualClassroomClientContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VirtualClassroomClientContext;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.joinCode !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.classId !== "string" ||
      (parsed.role !== "host" && parsed.role !== "member") ||
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearVirtualClassroomContext(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CONTEXT_KEY);
}

export function isOneOffVirtualClassroom(ctx: { classId: string }): boolean {
  return !ctx.classId;
}

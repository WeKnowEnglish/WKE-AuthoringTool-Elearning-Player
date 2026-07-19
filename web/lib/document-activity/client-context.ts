"use client";

export type DocumentSessionContext = {
  roundId: string;
  roomId: string;
  vcSessionId: string;
  role: "host" | "player";
  userId: string;
  displayName: string;
  color: string;
};

const CONTEXT_KEY = "wke-document-session-context";

export function setDocumentSessionContext(ctx: DocumentSessionContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}

export function getDocumentSessionContext(): DocumentSessionContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DocumentSessionContext;
    if (
      typeof parsed.roundId !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.vcSessionId !== "string" ||
      (parsed.role !== "host" && parsed.role !== "player") ||
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.color !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDocumentSessionContext(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CONTEXT_KEY);
}

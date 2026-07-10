export const SECONDARY_SESSION_CHANGED_EVENT = "secondary-session-changed";

export function notifySecondarySessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SECONDARY_SESSION_CHANGED_EVENT));
}

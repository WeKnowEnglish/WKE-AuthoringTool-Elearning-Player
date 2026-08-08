import { parseParentLocale, type ParentLocale } from "@/lib/parent/i18n/types";

export const PARENT_LANG_COOKIE = "wke-parent-lang";
export const PARENT_LANG_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function readParentLangCookie(cookieValue: string | undefined): ParentLocale | null {
  if (!cookieValue) return null;
  try {
    return parseParentLocale(decodeURIComponent(cookieValue));
  } catch {
    return parseParentLocale(cookieValue);
  }
}

/** Persist preferred parent UI language (client). */
export function writeParentLangCookie(locale: ParentLocale) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PARENT_LANG_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${PARENT_LANG_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

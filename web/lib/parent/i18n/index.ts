import { parentMessagesEn, type ParentMessageKey } from "@/lib/parent/i18n/en";
import { parentMessagesVi } from "@/lib/parent/i18n/vi";
import type { ParentLocale } from "@/lib/parent/i18n/types";

const catalogs: Record<ParentLocale, Record<ParentMessageKey, string>> = {
  en: parentMessagesEn,
  vi: parentMessagesVi,
};

export type { ParentMessageKey };
export type { ParentLocale } from "@/lib/parent/i18n/types";
export { parseParentLocale } from "@/lib/parent/i18n/types";

export function parentMessages(locale: ParentLocale): Record<ParentMessageKey, string> {
  return catalogs[locale] ?? catalogs.en;
}

/** Translate a parent UI string. Missing keys fall back to English, then the key. */
export function translateParent(
  locale: ParentLocale,
  key: ParentMessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw = catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    raw,
  );
}

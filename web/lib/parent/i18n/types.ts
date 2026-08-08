export type ParentLocale = "en" | "vi";

export function parseParentLocale(value: unknown): ParentLocale {
  return value === "vi" ? "vi" : "en";
}

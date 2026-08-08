import { afterEach, describe, expect, it, vi } from "vitest";
import { translateParent } from "@/lib/parent/i18n";
import { parentMessagesEn } from "@/lib/parent/i18n/en";
import { parentMessagesVi } from "@/lib/parent/i18n/vi";
import { parseParentLocale } from "@/lib/parent/i18n/types";

describe("parent i18n", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses en/vi only", () => {
    expect(parseParentLocale("vi")).toBe("vi");
    expect(parseParentLocale("en")).toBe("en");
    expect(parseParentLocale("fr")).toBe("en");
  });

  it("keeps Vietnamese catalog keys in sync with English", () => {
    const enKeys = Object.keys(parentMessagesEn).sort();
    const viKeys = Object.keys(parentMessagesVi).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it("interpolates count placeholders", () => {
    expect(
      translateParent("en", "nav.notificationsUnread", { count: 3 }),
    ).toBe("Notifications, 3 unread");
    expect(
      translateParent("vi", "nav.notificationsUnread", { count: 3 }),
    ).toContain("3");
  });
});

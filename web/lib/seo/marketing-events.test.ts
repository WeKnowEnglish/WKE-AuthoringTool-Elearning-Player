import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  MARKETING_EVENT_NAMES,
  trackMarketingEvent,
  type MarketingEventProps,
} from "@/lib/seo/marketing-events";

describe("marketing events", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      location: { pathname: "/" },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the approved event name list", () => {
    expect(MARKETING_EVENT_NAMES).toContain("homepage_view");
    expect(MARKETING_EVENT_NAMES).toContain("teacher_signup_start");
  });

  it("stores only sanitized props", () => {
    trackMarketingEvent("free_activity_start", {
      activityType: "flashcards",
      topic: "hobbies",
      cefr: "A1",
      ...({
        email: "student@example.com",
        joinCode: "ABC123",
      } as MarketingEventProps),
    });

    const raw = store.get("wke:marketing-events:v1");
    expect(raw).toBeTruthy();
    const events = JSON.parse(raw!) as Array<{ props: Record<string, unknown> }>;
    expect(events[0]?.props).toEqual({
      activityType: "flashcards",
      topic: "hobbies",
      cefr: "A1",
    });
    expect(JSON.stringify(events[0])).not.toMatch(/student@|ABC123|email|joinCode/i);
  });
});

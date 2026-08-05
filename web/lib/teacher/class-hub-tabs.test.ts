import { describe, expect, it } from "vitest";
import {
  classHubTabHref,
  classHubTabsForTier,
  defaultClassHubTab,
  parseClassHubTab,
} from "@/lib/teacher/class-hub-tabs";

describe("class-hub-tabs", () => {
  it("defaults unknown tabs to teach for plus", () => {
    expect(parseClassHubTab(undefined)).toBe("teach");
    expect(parseClassHubTab(null)).toBe("teach");
    expect(parseClassHubTab("nope")).toBe("teach");
  });

  it("defaults light teachers to students", () => {
    expect(parseClassHubTab(undefined, "light")).toBe("students");
    expect(parseClassHubTab("teach", "light")).toBe("students");
    expect(parseClassHubTab("lesson", "light")).toBe("lesson");
    expect(parseClassHubTab("stream", "light")).toBe("stream");
    expect(parseClassHubTab("schedule", "light")).toBe("schedule");
    expect(parseClassHubTab("students", "light")).toBe("students");
    expect(parseClassHubTab("settings", "light")).toBe("settings");
  });

  it("accepts known tabs for plus", () => {
    expect(parseClassHubTab("teach")).toBe("teach");
    expect(parseClassHubTab("lesson")).toBe("lesson");
    expect(parseClassHubTab("stream")).toBe("stream");
    expect(parseClassHubTab("schedule")).toBe("schedule");
    expect(parseClassHubTab("students")).toBe("students");
    expect(parseClassHubTab("settings")).toBe("settings");
  });

  it("lists lesson + stream + schedule + students + settings for light", () => {
    expect(classHubTabsForTier("light")).toEqual([
      "lesson",
      "stream",
      "schedule",
      "students",
      "settings",
    ]);
    expect(classHubTabsForTier("plus")).toEqual([
      "teach",
      "lesson",
      "stream",
      "schedule",
      "students",
      "settings",
    ]);
    expect(defaultClassHubTab("light")).toBe("students");
  });

  it("omits query for the default tab", () => {
    expect(classHubTabHref("abc", "teach")).toBe("/teacher/classes/abc");
    expect(classHubTabHref("abc", "lesson")).toBe("/teacher/classes/abc?tab=lesson");
    expect(classHubTabHref("abc", "stream")).toBe("/teacher/classes/abc?tab=stream");
    expect(classHubTabHref("abc", "schedule")).toBe("/teacher/classes/abc?tab=schedule");
    expect(classHubTabHref("abc", "students")).toBe("/teacher/classes/abc?tab=students");
    expect(classHubTabHref("abc", "settings")).toBe("/teacher/classes/abc?tab=settings");
    expect(classHubTabHref("abc", "students", "light")).toBe("/teacher/classes/abc");
  });
});

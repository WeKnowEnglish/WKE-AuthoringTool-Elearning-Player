import { describe, expect, it } from "vitest";
import {
  parseClassroomTab,
  visibleClassroomTabs,
} from "@/lib/classroom/classroom-tabs";

describe("classroom-tabs", () => {
  it("defaults to stream-only when optional tabs are off", () => {
    expect(visibleClassroomTabs()).toEqual(["stream"]);
    expect(parseClassroomTab("schedule")).toBe("stream");
    expect(parseClassroomTab("noticeboard")).toBe("stream");
    expect(parseClassroomTab("materials")).toBe("stream");
  });

  it("includes enabled optional tabs", () => {
    const settings = {
      schedule: true,
      noticeboard: false,
      materials: true,
    };
    expect(visibleClassroomTabs(settings)).toEqual(["stream", "schedule", "materials"]);
    expect(parseClassroomTab("schedule", settings)).toBe("schedule");
    expect(parseClassroomTab("noticeboard", settings)).toBe("stream");
    expect(parseClassroomTab("materials", settings)).toBe("materials");
  });
});

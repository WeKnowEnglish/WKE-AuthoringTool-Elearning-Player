import { describe, expect, it } from "vitest";
import { normalizeVirtualClassroomUiMode } from "@/lib/virtual-classroom/liveblocks/initial-storage";

describe("normalizeVirtualClassroomUiMode", () => {
  it("accepts meeting", () => {
    expect(normalizeVirtualClassroomUiMode("meeting")).toBe("meeting");
  });

  it("defaults everything else to learn", () => {
    expect(normalizeVirtualClassroomUiMode("learn")).toBe("learn");
    expect(normalizeVirtualClassroomUiMode(null)).toBe("learn");
    expect(normalizeVirtualClassroomUiMode(undefined)).toBe("learn");
    expect(normalizeVirtualClassroomUiMode("other")).toBe("learn");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeVirtualClassroomUiMode } from "@/lib/virtual-classroom/liveblocks/initial-storage";

describe("normalizeVirtualClassroomUiMode", () => {
  it("accepts learn", () => {
    expect(normalizeVirtualClassroomUiMode("learn")).toBe("learn");
  });

  it("defaults everything else to meeting", () => {
    expect(normalizeVirtualClassroomUiMode("meeting")).toBe("meeting");
    expect(normalizeVirtualClassroomUiMode(null)).toBe("meeting");
    expect(normalizeVirtualClassroomUiMode(undefined)).toBe("meeting");
    expect(normalizeVirtualClassroomUiMode("other")).toBe("meeting");
  });
});

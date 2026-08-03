import { describe, expect, it } from "vitest";
import { parentStudentPath, safeParentPath } from "@/lib/parent/parent-routes";

describe("parent routes", () => {
  it("accepts only internal parent paths", () => {
    expect(safeParentPath("/parent/students/abc/stream")).toBe("/parent/students/abc/stream");
    expect(safeParentPath("https://example.com")).toBe("/parent");
    expect(safeParentPath("//example.com/parent")).toBe("/parent");
    expect(safeParentPath("/teacher/classes")).toBe("/parent");
    expect(safeParentPath("/parent-impersonation")).toBe("/parent");
  });

  it("encodes student ids in generated paths", () => {
    expect(parentStudentPath("student id", "progress")).toBe(
      "/parent/students/student%20id/progress",
    );
  });
});

import { describe, expect, it } from "vitest";
import { normalizeVirtualClassroomPresentation } from "@/lib/virtual-classroom/presentation";

describe("virtual classroom presentation", () => {
  it("normalizes a shared image resource", () => {
    expect(normalizeVirtualClassroomPresentation({
      kind: "image",
      url: "https://cdn.example.com/map.png",
      title: "Community map",
      mediaAssetId: "asset-1",
    })).toEqual({
      kind: "image",
      url: "https://cdn.example.com/map.png",
      title: "Community map",
      mediaAssetId: "asset-1",
    });
  });

  it("accepts internal PDFs and rejects executable URLs", () => {
    expect(normalizeVirtualClassroomPresentation({ kind: "pdf", url: "/files/unit-1.pdf" }))
      .toMatchObject({ kind: "pdf", title: "Class PDF" });
    expect(normalizeVirtualClassroomPresentation({ kind: "pdf", url: "javascript:alert(1)" }))
      .toBeNull();
  });
});

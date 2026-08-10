import { describe, expect, it } from "vitest";
import {
  classroomPdfPageUrl,
  normalizeVirtualClassroomPresentation,
} from "@/lib/virtual-classroom/presentation";

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
      .toMatchObject({ kind: "pdf", title: "Class PDF", page: 1 });
    expect(normalizeVirtualClassroomPresentation({ kind: "pdf", url: "javascript:alert(1)" }))
      .toBeNull();
  });

  it("normalizes shared PDF pages and builds a browser page URL", () => {
    expect(
      normalizeVirtualClassroomPresentation({
        kind: "pdf",
        url: "https://cdn.example.com/unit.pdf",
        page: 4.8,
      }),
    ).toMatchObject({ page: 4 });
    expect(classroomPdfPageUrl("/files/unit.pdf#old", 6)).toBe(
      "/files/unit.pdf#page=6&view=FitH",
    );
    expect(classroomPdfPageUrl("/files/unit.pdf", -2)).toContain("page=1");
  });
});

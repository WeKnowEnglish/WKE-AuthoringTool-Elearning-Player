import { describe, expect, it } from "vitest";
import {
  createResourceDownloadToken,
  verifyResourceDownloadToken,
} from "@/lib/lesson-plans/download-token";
import { findLessonBySlug, parseMiniSeriesResourceId } from "@/lib/lesson-plans/mini-series-manifest";

describe("resource download token", () => {
  it("round-trips a valid token", () => {
    const token = createResourceDownloadToken("Teacher@School.edu");
    const payload = verifyResourceDownloadToken(token);
    expect(payload?.email).toBe("teacher@school.edu");
    expect(payload?.bundleId).toBe("mini-series-library");
  });

  it("rejects tampered tokens", () => {
    const token = createResourceDownloadToken("a@b.com");
    const payload = verifyResourceDownloadToken(`${token}x`);
    expect(payload).toBeNull();
  });
});

describe("mini-series manifest", () => {
  it("parses resource ids", () => {
    expect(parseMiniSeriesResourceId("library")).toEqual({ kind: "library" });
    expect(parseMiniSeriesResourceId("pack:a1-routines")).toEqual({
      kind: "pack",
      packSlug: "a1-routines",
    });
    expect(parseMiniSeriesResourceId("lesson:a1-pets")).toEqual({
      kind: "lesson",
      lessonSlug: "a1-pets",
    });
  });

  it("finds imported lesson files in manifest", () => {
    const found = findLessonBySlug("a1-pets");
    expect(found?.lesson.filename).toBe("A1_Pets_Mini_Series.docx");
    expect(found?.pack.slug).toBe("a1-pets-and-around-town");
  });
});

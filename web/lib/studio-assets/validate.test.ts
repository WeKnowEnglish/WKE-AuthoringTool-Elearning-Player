import { describe, expect, it } from "vitest";
import {
  assertStudioAssetAllowed,
  inferStudioAssetKind,
  parseStudioAssetMeta,
  sanitizeStudioFilename,
} from "./validate";

describe("studio-assets validate", () => {
  it("sanitizes filenames", () => {
    expect(sanitizeStudioFilename("../../ok photo!.png")).toBe("ok_photo_.png");
  });

  it("infers kind from mime and explicit override", () => {
    expect(inferStudioAssetKind("image/png")).toBe("image");
    expect(inferStudioAssetKind("audio/webm")).toBe("audio");
    expect(inferStudioAssetKind("audio/webm", "audio")).toBe("audio");
    expect(() => inferStudioAssetKind("text/plain")).toThrow(/Unsupported/);
  });

  it("enforces size and mime", () => {
    expect(() => assertStudioAssetAllowed("image", "image/png", 10)).not.toThrow();
    expect(() => assertStudioAssetAllowed("image", "image/png", 0)).toThrow(/Empty/);
    expect(() => assertStudioAssetAllowed("audio", "image/png", 10)).toThrow(/audio/);
  });

  it("parses meta JSON object only", () => {
    expect(parseStudioAssetMeta('{"packId":"hobbies"}')).toEqual({ packId: "hobbies" });
    expect(parseStudioAssetMeta(null)).toEqual({});
    expect(() => parseStudioAssetMeta("[1]")).toThrow(/object/);
  });
});

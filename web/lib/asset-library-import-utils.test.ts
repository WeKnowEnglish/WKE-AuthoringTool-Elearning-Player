import { describe, expect, it } from "vitest";
// The production intake command runs directly in Node and intentionally uses an
// ESM module so it does not depend on the application compiler.
// @ts-expect-error The small Node utility does not need a separate declaration file.
import {
  buildAssetMetadata,
  correctedStem,
  displayNameForFile,
  storageFilename,
} from "../scripts/asset-library-import-utils.mjs";

describe("AI asset library import metadata", () => {
  it("corrects source typos without losing the original search term", () => {
    expect(correctedStem("school councelor.png")).toBe("school counselor");
    expect(displayNameForFile("two girls making a psoter.png")).toBe("Two Girls Making A Poster");
    expect(storageFilename("pencile sharpener.png")).toBe("pencil-sharpener.webp");
  });

  it("classifies a transparent vocabulary object conservatively", () => {
    const metadata = buildAssetMetadata({
      filename: "cabbage.png",
      collection: "School Life Starter",
      width: 1024,
      height: 1536,
      isOpaque: false,
      importedOn: "2026-08-02",
    });
    expect(metadata.meta_item_name).toBe("Cabbage");
    expect(metadata.meta_word_type).toBe("noun");
    expect(metadata.meta_countability).toBe("countable");
    expect(metadata.meta_tags).toEqual(expect.arrayContaining(["ai-generated", "transparent-cutout", "vocabulary"]));
    expect(metadata.meta_level).toBeNull();
  });

  it("marks an opaque landscape classroom composition as a background scene", () => {
    const metadata = buildAssetMetadata({
      filename: "students in classroom learning.png",
      collection: "school-life-starter-2026-08",
      width: 1536,
      height: 1024,
      isOpaque: true,
      importedOn: "2026-08-02",
    });
    expect(metadata.meta_categories).toEqual(expect.arrayContaining(["actions", "people", "school"]));
    expect(metadata.meta_tags).toEqual(expect.arrayContaining(["background", "scene", "story-scene"]));
    expect(metadata.meta_word_type).toBeNull();
  });

  it("uses inclusive display metadata for the legacy cafeteria filename", () => {
    const metadata = buildAssetMetadata({
      filename: "school lunch lady.png",
      collection: "school-life-starter-2026-08",
      width: 1024,
      height: 1536,
      isOpaque: false,
      importedOn: "2026-08-02",
    });
    expect(metadata.meta_item_name).toBe("School cafeteria worker");
    expect(metadata.meta_alternative_names).toContain("school lunch lady");
  });
});


import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import {
  applyLexiconMediaPreferences,
  lexiconLinkRoleFromStudioMeta,
  mediaCategoriesFromStudioMeta,
  shouldBridgeStudioMetaToMediaLibrary,
} from "@/lib/vocabulary/lexicon-media/apply-to-vocab-list";

describe("applyLexiconMediaPreferences", () => {
  it("fills missing image/audio from lexicon preferences", () => {
    const list = createBakeryVocabularyListDocument();
    const first = list.entries[0]!;
    const withSource = {
      ...list,
      entries: [
        { ...first, sourceWordId: "pv_bread", imageUrl: undefined, audioUrl: undefined },
        ...list.entries.slice(1),
      ],
    };

    const next = applyLexiconMediaPreferences(withSource, {
      pv_bread: {
        imageUrl: "https://cdn.example/bread.png",
        audioUrl: "https://cdn.example/bread.mp3",
      },
    });

    expect(next.entries[0]?.imageUrl).toBe("https://cdn.example/bread.png");
    expect(next.entries[0]?.audioUrl).toBe("https://cdn.example/bread.mp3");
  });

  it("does not overwrite existing entry media", () => {
    const list = createBakeryVocabularyListDocument();
    const first = list.entries[0]!;
    const withMedia = {
      ...list,
      entries: [
        {
          ...first,
          sourceWordId: "pv_bread",
          imageUrl: "https://cdn.example/keep.png",
          audioUrl: "https://cdn.example/keep.mp3",
        },
        ...list.entries.slice(1),
      ],
    };

    const next = applyLexiconMediaPreferences(withMedia, {
      pv_bread: {
        imageUrl: "https://cdn.example/other.png",
        audioUrl: "https://cdn.example/other.mp3",
      },
    });

    expect(next.entries[0]?.imageUrl).toBe("https://cdn.example/keep.png");
    expect(next.entries[0]?.audioUrl).toBe("https://cdn.example/keep.mp3");
  });
});

describe("shouldBridgeStudioMetaToMediaLibrary", () => {
  it("bridges vocabulary, hotspots, and scene roles", () => {
    expect(shouldBridgeStudioMetaToMediaLibrary({ source: "vocabulary_list" })).toBe(
      true,
    );
    expect(
      shouldBridgeStudioMetaToMediaLibrary({ sourceWordId: "pv_bread" }),
    ).toBe(true);
    expect(shouldBridgeStudioMetaToMediaLibrary({ word: "bread" })).toBe(true);
    expect(
      shouldBridgeStudioMetaToMediaLibrary({ source: "explore_hotspots" }),
    ).toBe(true);
    expect(
      shouldBridgeStudioMetaToMediaLibrary({ via: "explore_hotspots_workspace" }),
    ).toBe(true);
    expect(shouldBridgeStudioMetaToMediaLibrary({ mediaRole: "sprite" })).toBe(true);
    expect(shouldBridgeStudioMetaToMediaLibrary({ source: "other_tool" })).toBe(false);
  });
});

describe("mediaCategoriesFromStudioMeta", () => {
  it("tags hotspot art as scene and vocab as vocabulary", () => {
    expect(mediaCategoriesFromStudioMeta({ source: "explore_hotspots" })).toEqual([
      "scene",
    ]);
    expect(mediaCategoriesFromStudioMeta({ mediaRole: "sprite" })).toEqual(["sprite"]);
    expect(mediaCategoriesFromStudioMeta({ source: "vocabulary_list" })).toEqual([
      "vocabulary",
    ]);
  });
});

describe("lexiconLinkRoleFromStudioMeta", () => {
  it("maps scene art and audio roles", () => {
    expect(
      lexiconLinkRoleFromStudioMeta({ mediaRole: "background" }, "image"),
    ).toBe("scene");
    expect(lexiconLinkRoleFromStudioMeta({}, "audio")).toBe("pronunciation");
    expect(lexiconLinkRoleFromStudioMeta({}, "image")).toBe("illustration");
  });
});

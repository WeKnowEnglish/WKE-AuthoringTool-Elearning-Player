import { describe, expect, it } from "vitest";
import { createBlankExploreHotspotsDocument } from "@/lib/hotspots/fixtures/blankExploreHotspots";
import { applyMediaAssetUrlMap } from "@/lib/hotspots/resolve-media-asset-urls";
import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";

describe("applyMediaAssetUrlMap", () => {
  it("refreshes http image src and audio urls from mediaAssetId", () => {
    const blank = createBlankExploreHotspotsDocument();
    const assetId = blank.assets[0]!.id;
    const doc: ExploreHotspotsDocument = {
      ...blank,
      assets: blank.assets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              src: "https://old.example/bg.png",
              mediaAssetId: "media-1",
            }
          : asset,
      ),
      interaction: {
        ...blank.interaction,
        phases: [
          {
            id: "phase-1",
            imageAssetId: assetId,
            hotspotIds: [],
            onEnter: [
              {
                id: "scene-enter-audio",
                type: "play_audio",
                audioUrl: "https://old.example/a.mp3",
                mediaAssetId: "media-audio",
              },
            ],
          },
        ],
        dialogues: [
          {
            id: "d1",
            hotspotId: "h1",
            title: "Hi",
            turns: [
              {
                speaker: "AJ",
                text: "Hello",
                audioUrl: "https://old.example/t.mp3",
                mediaAssetId: "media-turn",
              },
            ],
          },
        ],
      },
    };

    const next = applyMediaAssetUrlMap(
      doc,
      new Map([
        ["media-1", "https://new.example/bg.png"],
        ["media-audio", "https://new.example/a.mp3"],
        ["media-turn", "https://new.example/t.mp3"],
      ]),
    );

    expect(next.assets[0]?.src).toBe("https://new.example/bg.png");
    expect(next.interaction.phases?.[0]?.onEnter?.[0]).toMatchObject({
      audioUrl: "https://new.example/a.mp3",
    });
    expect(next.interaction.dialogues[0]?.turns[0]?.audioUrl).toBe(
      "https://new.example/t.mp3",
    );
  });

  it("does not overwrite data-URL sprite src (processed local art)", () => {
    const blank = createBlankExploreHotspotsDocument();
    const doc: ExploreHotspotsDocument = {
      ...blank,
      assets: [
        ...blank.assets,
        {
          id: "sprite-1",
          kind: "image",
          src: "data:image/png;base64,abc",
          mediaAssetId: "media-sprite",
        },
      ],
    };

    const next = applyMediaAssetUrlMap(
      doc,
      new Map([["media-sprite", "https://new.example/sprite.png"]]),
    );

    expect(next.assets.find((a) => a.id === "sprite-1")?.src).toBe(
      "data:image/png;base64,abc",
    );
  });
});

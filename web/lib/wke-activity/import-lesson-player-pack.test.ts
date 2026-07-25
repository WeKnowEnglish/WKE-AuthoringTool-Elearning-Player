import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importLessonPlayerHotspotPack } from "@/lib/wke-activity/import-lesson-player-pack";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function sampleActivity() {
  return {
    version: 2 as const,
    kind: "activity-authoring" as const,
    id: "pack-test",
    name: "Pack test",
    content: {
      instruction: "Tap each child.",
      completionMessage: "Done.",
    },
    assets: [
      {
        id: "img-1",
        kind: "image",
        src: "/pilots/explore-hotspots/demo.png",
        mimeType: "image/png",
        intrinsicSize: { width: 16, height: 9 },
      },
    ],
    layout: {
      aspectRatio: "16:9",
      regions: [
        { id: "main-media", role: "media", widthFraction: 0.7 },
        { id: "side", role: "side-panel", widthFraction: 0.3 },
      ],
      elements: [
        {
          id: "media-1",
          kind: "media",
          regionId: "main-media",
          assetId: "img-1",
          fit: "contain",
        },
        {
          id: "hot-1",
          kind: "hotspot",
          regionId: "main-media",
          name: "Mia",
          accessibleLabel: "Mia",
          required: true,
          tabOrder: 1,
          geometry: {
            shape: "polygon",
            points: [
              { x: 0.1, y: 0.2 },
              { x: 0.3, y: 0.2 },
              { x: 0.3, y: 0.6 },
              { x: 0.1, y: 0.6 },
            ],
          },
          visualShape: {
            type: "segmentation-contour",
            sourceAssetId: "img-1",
            sourceWidth: 16,
            sourceHeight: 9,
            paths: [
              [
                { x: 0.1, y: 0.2 },
                { x: 0.3, y: 0.2 },
                { x: 0.3, y: 0.6 },
                { x: 0.1, y: 0.6 },
              ],
            ],
          },
        },
        {
          id: "panel-1",
          kind: "dialogue-panel",
          regionId: "side",
          emptyStateText: "Choose a child.",
          showTranscript: true,
          showReplay: true,
          showProgress: true,
        },
      ],
    },
    interaction: {
      type: "explore-hotspots" as const,
      completion: { type: "visit-all-required-hotspots" as const },
      visitedWhen: "dialogue-started" as const,
      autoPlayOnSelect: true,
      dialogues: [
        {
          id: "d1",
          hotspotId: "hot-1",
          title: "Mia",
          turns: [
            { speaker: "AJ", text: "What do you like doing?" },
            { speaker: "Mia", text: "I like drawing." },
          ],
        },
      ],
    },
  };
}

describe("importLessonPlayerHotspotPack", () => {
  it("imports embedded json", async () => {
    const activity = sampleActivity();
    activity.assets[0]!.src = tinyPng;
    const file = new File([JSON.stringify(activity)], "pack-test.wkeactivity.json", {
      type: "application/json",
    });
    const imported = await importLessonPlayerHotspotPack(file);
    const payload = wkeActivityToExploreHotspotsPayload(imported.document);
    expect(payload.hotspots[0]?.visual_shape?.paths[0]?.length).toBeGreaterThanOrEqual(3);
    expect(payload.image_url.startsWith("data:")).toBe(true);
  });

  it("imports zip and remaps assets to blob urls", async () => {
    const activity = sampleActivity();
    const zip = new JSZip();
    zip.file("pack-test.wkeactivity.json", `${JSON.stringify(activity, null, 2)}\n`);
    // 1x1 png
    const bytes = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
      (c) => c.charCodeAt(0),
    );
    zip.file("assets/demo.png", bytes);
    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "pack-test.lessonplayer.zip", {
      type: "application/zip",
    });

    const imported = await importLessonPlayerHotspotPack(file);
    expect(imported.objectUrls.length).toBe(1);
    expect(imported.document.assets[0]?.src.startsWith("blob:")).toBe(true);
    const payload = wkeActivityToExploreHotspotsPayload(imported.document);
    expect(payload.image_url.startsWith("blob:")).toBe(true);
    for (const url of imported.objectUrls) URL.revokeObjectURL(url);
  });
});

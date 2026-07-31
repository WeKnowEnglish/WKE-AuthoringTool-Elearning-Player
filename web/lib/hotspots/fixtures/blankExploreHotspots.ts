import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";

const PLACEHOLDER_SCENE_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#e7e5e4"/>
    <text x="800" y="430" text-anchor="middle" fill="#57534e" font-family="system-ui,sans-serif" font-size="36">Scene image</text>
    <text x="800" y="480" text-anchor="middle" fill="#78716c" font-family="system-ui,sans-serif" font-size="22">Use Replace image to add your artwork</text>
  </svg>`,
)}`;

/** Minimal valid explore-hotspots document for Start new. */
export function createBlankExploreHotspotsDocument(): ExploreHotspotsDocument {
  const assetId = "scene-image-1";
  const hotspotId = "hotspot-1";
  const dialogueId = "dialogue-hotspot-1";
  return {
    version: 2,
    kind: "activity-authoring",
    id: `explore-hotspots-${Date.now()}`,
    name: "Untitled explore hotspots",
    content: {
      instruction: "Tap each object to learn more.",
      completionMessage: "Great job!",
    },
    assets: [
      {
        id: assetId,
        kind: "image",
        src: PLACEHOLDER_SCENE_SRC,
        mimeType: "image/svg+xml",
        intrinsicSize: { width: 16, height: 9 },
        alt: "Scene placeholder",
      },
    ],
    layout: {
      aspectRatio: "16:9",
      responsive: "side-by-side-then-stack",
      regions: [
        { id: "main-media", role: "media", widthFraction: 0.72 },
        { id: "dialogue-side-panel", role: "side-panel", widthFraction: 0.28 },
      ],
      elements: [
        {
          id: "main-picture",
          kind: "media",
          regionId: "main-media",
          assetId,
          fit: "contain",
        },
        {
          id: hotspotId,
          kind: "hotspot",
          regionId: "main-media",
          name: "Object 1",
          accessibleLabel: "Object 1",
          geometry: { shape: "rectangle", x: 0.35, y: 0.35, width: 0.3, height: 0.25 },
          tabOrder: 1,
          required: true,
        },
        {
          id: "dialogue-panel",
          kind: "dialogue-panel",
          regionId: "dialogue-side-panel",
          emptyStateText: "Choose an object to hear more.",
          showTranscript: true,
          showReplay: true,
          showProgress: true,
        },
      ],
    },
    interaction: {
      type: "explore-hotspots",
      completion: { type: "visit-all-required-hotspots" },
      visitedWhen: "dialogue-started",
      autoPlayOnSelect: true,
      dialogues: [
        {
          id: dialogueId,
          hotspotId,
          title: "Object 1",
          turns: [
            { speaker: "Teacher", text: "What is this?" },
            { speaker: "Student", text: "It is…" },
          ],
        },
      ],
    },
  };
}

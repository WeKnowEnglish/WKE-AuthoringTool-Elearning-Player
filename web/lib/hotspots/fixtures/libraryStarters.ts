import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";

const PLACEHOLDER_SCENE_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#e7e5e4"/>
    <text x="800" y="430" text-anchor="middle" fill="#57534e" font-family="system-ui,sans-serif" font-size="36">Scene image</text>
    <text x="800" y="480" text-anchor="middle" fill="#78716c" font-family="system-ui,sans-serif" font-size="22">Use Change scene background to add your artwork</text>
  </svg>`,
)}`;

const COVER_SCENE_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#e0f2fe"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#g)"/>
    <text x="800" y="450" text-anchor="middle" fill="#0c4a6e" font-family="system-ui,sans-serif" font-size="40">Cover scene</text>
    <text x="800" y="510" text-anchor="middle" fill="#0369a1" font-family="system-ui,sans-serif" font-size="22">Replace this background, then edit title text</text>
  </svg>`,
)}`;

function shell(args: {
  id: string;
  name: string;
  instruction: string;
  assets: ExploreHotspotsDocument["assets"];
  elements: ExploreHotspotsDocument["layout"]["elements"];
  dialogues: ExploreHotspotsDocument["interaction"]["dialogues"];
  phases: NonNullable<ExploreHotspotsDocument["interaction"]["phases"]>;
  objectiveLabel: string;
}): ExploreHotspotsDocument {
  return {
    version: 2,
    kind: "activity-authoring",
    id: args.id,
    name: args.name,
    content: {
      instruction: args.instruction,
      completionMessage: "Great job!",
    },
    assets: args.assets,
    layout: {
      aspectRatio: "16:9",
      responsive: "side-by-side-then-stack",
      regions: [
        { id: "main-media", role: "media", widthFraction: 0.72 },
        { id: "dialogue-side-panel", role: "side-panel", widthFraction: 0.28 },
      ],
      elements: args.elements,
    },
    interaction: {
      type: "explore-hotspots",
      completion: { type: "visit-all-required-hotspots" },
      visitedWhen: "dialogue-started",
      autoPlayOnSelect: true,
      objective: { label: args.objectiveLabel },
      dialogues: args.dialogues,
      phases: args.phases,
    },
  };
}

/** Two-scene starter: cover title + explore hotspot. */
export function createCoverAndExploreStarterDocument(): ExploreHotspotsDocument {
  const coverAssetId = "cover-image";
  const exploreAssetId = "explore-image";
  const titleId = "text-title";
  const subtitleId = "text-subtitle";
  const accentId = "shape-accent";
  const hotspotId = "hotspot-1";
  const dialogueId = "dialogue-hotspot-1";

  return shell({
    id: "wke-library-cover-and-explore",
    name: "Cover + Explore starter",
    instruction: "Explore the scene and tap each object.",
    objectiveLabel: "Find the objects in the explore scene",
    assets: [
      {
        id: coverAssetId,
        kind: "image",
        src: COVER_SCENE_SRC,
        mimeType: "image/svg+xml",
        intrinsicSize: { width: 16, height: 9 },
        alt: "Cover placeholder",
      },
      {
        id: exploreAssetId,
        kind: "image",
        src: PLACEHOLDER_SCENE_SRC,
        mimeType: "image/svg+xml",
        intrinsicSize: { width: 16, height: 9 },
        alt: "Explore placeholder",
      },
    ],
    elements: [
      {
        id: "main-picture",
        kind: "media",
        regionId: "main-media",
        assetId: coverAssetId,
        fit: "contain",
      },
      {
        id: titleId,
        kind: "hotspot",
        regionId: "main-media",
        name: "Title",
        accessibleLabel: "Title",
        presentation: "text",
        labelText: "Lesson title",
        interactionKind: "none",
        required: false,
        geometry: { shape: "rectangle", x: 0.18, y: 0.28, width: 0.64, height: 0.16 },
        textStyle: { role: "title", align: "center" },
        highlight: { style: "outline", color: "#0c4a6e" },
        animation: { entrance: "pop", entranceDurationMs: 600 },
        zIndex: 2,
        tabOrder: 1,
        orderIndex: 0,
        initialState: "available",
      },
      {
        id: subtitleId,
        kind: "hotspot",
        regionId: "main-media",
        name: "Subtitle",
        accessibleLabel: "Subtitle",
        presentation: "text",
        labelText: "A short line for students",
        interactionKind: "none",
        required: false,
        geometry: { shape: "rectangle", x: 0.22, y: 0.48, width: 0.56, height: 0.08 },
        textStyle: { role: "caption", align: "center" },
        highlight: { style: "outline", color: "#0369a1" },
        animation: {
          entrance: "fade_in",
          entranceDurationMs: 500,
          entranceDelayMs: 250,
        },
        zIndex: 3,
        tabOrder: 2,
        orderIndex: 1,
        initialState: "available",
      },
      {
        id: accentId,
        kind: "hotspot",
        regionId: "main-media",
        name: "Accent",
        accessibleLabel: "Accent shape",
        presentation: "shape",
        interactionKind: "none",
        required: false,
        geometry: { shape: "rectangle", x: 0.42, y: 0.62, width: 0.16, height: 0.04 },
        highlight: { style: "outline", color: "#38bdf8" },
        zIndex: 1,
        tabOrder: 3,
        orderIndex: 2,
        initialState: "available",
      },
      {
        id: hotspotId,
        kind: "hotspot",
        regionId: "main-media",
        name: "Object 1",
        accessibleLabel: "Object 1",
        presentation: "target",
        interactionKind: "dialogue",
        required: true,
        geometry: { shape: "rectangle", x: 0.35, y: 0.35, width: 0.3, height: 0.25 },
        zIndex: 1,
        tabOrder: 4,
        orderIndex: 0,
        initialState: "available",
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
    phases: [
      {
        id: "phase-cover",
        title: "Cover",
        imageAssetId: coverAssetId,
        hotspotIds: [titleId, subtitleId, accentId],
        onEnter: [{ id: "cover-wait", type: "wait", ms: 200 }],
        objective: { label: "Look at the cover" },
        hintPulseEnabled: false,
      },
      {
        id: "phase-explore",
        title: "Explore",
        imageAssetId: exploreAssetId,
        hotspotIds: [hotspotId],
        objective: { label: "Find Object 1" },
        hintPulseEnabled: true,
      },
    ],
  });
}

/** Single-scene vocab board with three labels and three hotspots. */
export function createVocabBoardStarterDocument(): ExploreHotspotsDocument {
  const assetId = "vocab-board-image";
  const labels = [
    { id: "text-1", label: "Word 1", x: 0.08, y: 0.18 },
    { id: "text-2", label: "Word 2", x: 0.38, y: 0.18 },
    { id: "text-3", label: "Word 3", x: 0.68, y: 0.18 },
  ] as const;
  const targets = [
    { id: "hotspot-1", name: "Picture 1", x: 0.08, y: 0.38 },
    { id: "hotspot-2", name: "Picture 2", x: 0.38, y: 0.38 },
    { id: "hotspot-3", name: "Picture 3", x: 0.68, y: 0.38 },
  ] as const;

  return shell({
    id: "wke-library-vocab-board",
    name: "Vocab board starter",
    instruction: "Tap each picture and say the word.",
    objectiveLabel: "Practice three new words",
    assets: [
      {
        id: assetId,
        kind: "image",
        src: PLACEHOLDER_SCENE_SRC,
        mimeType: "image/svg+xml",
        intrinsicSize: { width: 16, height: 9 },
        alt: "Vocab board placeholder",
      },
    ],
    elements: [
      {
        id: "main-picture",
        kind: "media",
        regionId: "main-media",
        assetId,
        fit: "contain",
      },
      ...labels.map((item, index) => ({
        id: item.id,
        kind: "hotspot" as const,
        regionId: "main-media",
        name: item.label,
        accessibleLabel: item.label,
        presentation: "text" as const,
        labelText: item.label,
        interactionKind: "none" as const,
        required: false,
        geometry: {
          shape: "rectangle" as const,
          x: item.x,
          y: item.y,
          width: 0.24,
          height: 0.1,
        },
        textStyle: { role: "body" as const, align: "center" as const },
        highlight: { style: "outline" as const, color: "#1c1917" },
        zIndex: index + 1,
        tabOrder: index + 1,
        orderIndex: index,
        initialState: "available" as const,
      })),
      ...targets.map((item, index) => ({
        id: item.id,
        kind: "hotspot" as const,
        regionId: "main-media",
        name: item.name,
        accessibleLabel: item.name,
        presentation: "target" as const,
        interactionKind: "dialogue" as const,
        required: true,
        geometry: {
          shape: "rectangle" as const,
          x: item.x,
          y: item.y,
          width: 0.24,
          height: 0.28,
        },
        zIndex: index + 4,
        tabOrder: index + 4,
        orderIndex: index,
        initialState: "available" as const,
      })),
      {
        id: "dialogue-panel",
        kind: "dialogue-panel",
        regionId: "dialogue-side-panel",
        emptyStateText: "Choose a picture to practice the word.",
        showTranscript: true,
        showReplay: true,
        showProgress: true,
      },
    ],
    dialogues: targets.map((item) => ({
      id: `dialogue-${item.id}`,
      hotspotId: item.id,
      title: item.name,
      turns: [
        { speaker: "Teacher", text: "What is this?" },
        { speaker: "Student", text: "It is…" },
      ],
    })),
    phases: [
      {
        id: "phase-board",
        title: "Vocab board",
        imageAssetId: assetId,
        hotspotIds: [
          ...labels.map((item) => item.id),
          ...targets.map((item) => item.id),
        ],
        objective: { label: "Tap each picture" },
        hintPulseEnabled: true,
      },
    ],
  });
}

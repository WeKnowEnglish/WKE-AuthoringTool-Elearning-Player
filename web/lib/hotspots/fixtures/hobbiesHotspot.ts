import type { ExploreHotspotsDocument, HotspotElement } from "@/lib/hotspots/types";

const hotspot = (
  id: string,
  name: string,
  accessibleLabel: string,
  tabOrder: number,
  geometry: HotspotElement["geometry"],
): HotspotElement => ({
  id,
  kind: "hotspot",
  regionId: "main-media",
  name,
  accessibleLabel,
  geometry,
  tabOrder,
  required: true,
});

/** Phase 0 reference fixture. Geometry is normalized to the supplied 1672 × 939 artwork. */
export const HOBBIES_HOTSPOT_ACTIVITY: ExploreHotspotsDocument = {
  version: 2,
  kind: "activity-authoring",
  id: "hobbies-listening-hotspots",
  name: "What do you like doing?",
  educationalIntent: {
    objective: "Connect four hobby phrases with visual contexts and understand I like + -ing in short dialogues.",
    successCriteria: "Listen to all four children and identify drawing, reading comics, cycling, and taking photos.",
    cefr: "A1",
    vocabulary: ["drawing pictures", "reading comics", "riding a bike", "taking photos"],
    languageFrames: ["What do you like doing?", "I like + -ing."],
  },
  content: {
    instruction: "Click each child. Listen to what they like doing.",
    completionMessage: "Great listening! You heard all four children talk about their hobbies.",
  },
  assets: [
    {
      id: "hobbies-classroom-image",
      kind: "image",
      src: "/pilots/explore-hotspots/hobbies-and-likes-classroom.png",
      mimeType: "image/png",
      intrinsicSize: { width: 1672, height: 939 },
      alt: "Four children drawing, reading a comic, preparing to ride a bicycle, and taking a photograph in a bright classroom.",
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
      { id: "hobbies-picture", kind: "media", regionId: "main-media", assetId: "hobbies-classroom-image", fit: "contain" },
      hotspot("mia-drawing", "Mia", "Mia drawing a picture at the table", 1, {
        shape: "polygon",
        points: [{ x: 0.1, y: 0.3 }, { x: 0.23, y: 0.26 }, { x: 0.31, y: 0.48 }, { x: 0.28, y: 0.75 }, { x: 0.16, y: 0.77 }, { x: 0.1, y: 0.61 }],
      }),
      hotspot("ben-reading", "Ben", "Ben reading a space comic on the chair", 2, {
        shape: "polygon",
        points: [{ x: 0.32, y: 0.23 }, { x: 0.43, y: 0.19 }, { x: 0.53, y: 0.43 }, { x: 0.55, y: 0.63 }, { x: 0.39, y: 0.67 }, { x: 0.32, y: 0.53 }],
      }),
      hotspot("leo-cycling", "Leo", "Leo wearing a bicycle helmet beside his bicycle", 3, {
        shape: "polygon",
        points: [{ x: 0.61, y: 0.29 }, { x: 0.73, y: 0.34 }, { x: 0.78, y: 0.59 }, { x: 0.75, y: 0.83 }, { x: 0.62, y: 0.77 }, { x: 0.56, y: 0.57 }],
      }),
      hotspot("sara-photography", "Sara", "Sara taking a photograph with a camera", 4, {
        shape: "polygon",
        points: [{ x: 0.77, y: 0.12 }, { x: 0.89, y: 0.1 }, { x: 0.92, y: 0.35 }, { x: 0.88, y: 0.8 }, { x: 0.79, y: 0.78 }, { x: 0.76, y: 0.47 }],
      }),
      {
        id: "hobby-dialogue-panel",
        kind: "dialogue-panel",
        regionId: "dialogue-side-panel",
        emptyStateText: "Choose a child to hear about their hobby.",
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
        id: "dialogue-mia-drawing",
        hotspotId: "mia-drawing",
        title: "Mia likes drawing",
        turns: [
          { speaker: "AJ", text: "What do you like doing?" },
          { speaker: "Mia", text: "I like drawing pictures. I draw after school." },
        ],
      },
      {
        id: "dialogue-ben-reading",
        hotspotId: "ben-reading",
        title: "Ben likes reading comics",
        turns: [
          { speaker: "AJ", text: "What do you like doing?" },
          { speaker: "Ben", text: "I like reading comics. Space stories are my favorite!" },
        ],
      },
      {
        id: "dialogue-leo-cycling",
        hotspotId: "leo-cycling",
        title: "Leo likes riding his bike",
        turns: [
          { speaker: "AJ", text: "What do you like doing?" },
          { speaker: "Leo", text: "I like riding my bike. I ride in the park." },
        ],
      },
      {
        id: "dialogue-sara-photography",
        hotspotId: "sara-photography",
        title: "Sara likes taking photos",
        turns: [
          { speaker: "AJ", text: "What do you like doing?" },
          { speaker: "Sara", text: "I like taking photos. I take photos of my friends." },
        ],
      },
    ],
  },
  accessibility: {
    keyboardEnabled: true,
    transcriptFallback: true,
    announceProgress: true,
  },
};

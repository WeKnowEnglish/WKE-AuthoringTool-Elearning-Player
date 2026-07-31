import hobbiesListening from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";
import {
  createCoverAndExploreStarterDocument,
  createVocabBoardStarterDocument,
} from "@/lib/hotspots/fixtures/libraryStarters";

export type WkeLibraryExampleRef = {
  id: string;
  title: string;
  description: string;
  cefr?: string;
  tags: string[];
};

/** Curated explore-hotspots examples teachers can open as references. */
export const EXPLORE_HOTSPOTS_WKE_LIBRARY: WkeLibraryExampleRef[] = [
  {
    id: "cover-and-explore",
    title: "Cover + Explore starter",
    description:
      "Two scenes: a cover with title text animations, then an explore hotspot to fill in.",
    cefr: "A1",
    tags: ["multi-scene", "starter", "cover"],
  },
  {
    id: "vocab-board",
    title: "Vocab board starter",
    description:
      "Single-scene board with three labels and three tap targets — swap in your art and words.",
    cefr: "A1",
    tags: ["vocabulary", "starter", "single scene"],
  },
  {
    id: "hobbies-listening",
    title: "What do you like doing?",
    description:
      "Single-scene listening activity — four hobby hotspots with short dialogues and I like + -ing frames.",
    cefr: "A1",
    tags: ["listening", "hobbies", "single scene"],
  },
  {
    id: "mias-morning",
    title: "Mia's Morning!",
    description:
      "Multi-scene morning routine with cover entrance animations, sprite props, and scene-to-scene storytelling.",
    cefr: "A1",
    tags: ["multi-scene", "sprites", "cover animation", "daily routine"],
  },
];

export function getExploreHotspotsLibraryRef(
  id: string,
): WkeLibraryExampleRef | undefined {
  return EXPLORE_HOTSPOTS_WKE_LIBRARY.find((entry) => entry.id === id);
}

/** Load a library example on demand (large samples stay out of the main bundle). */
export async function loadExploreHotspotsLibraryExample(
  id: string,
): Promise<ExploreHotspotsDocument> {
  switch (id) {
    case "cover-and-explore":
      return validateExploreHotspotsDocument(createCoverAndExploreStarterDocument());
    case "vocab-board":
      return validateExploreHotspotsDocument(createVocabBoardStarterDocument());
    case "hobbies-listening":
      return validateExploreHotspotsDocument(hobbiesListening);
    case "mias-morning": {
      const response = await fetch(
        "/wke-library/explore-hotspots/mias-morning.wkeactivity.json",
      );
      if (!response.ok) {
        throw new Error("Could not load Mia's Morning from the WKE Library.");
      }
      return validateExploreHotspotsDocument(await response.json());
    }
    default:
      throw new Error("That WKE Library example was not found.");
  }
}

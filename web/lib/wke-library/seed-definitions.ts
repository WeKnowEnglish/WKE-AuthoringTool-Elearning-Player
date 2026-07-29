import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import hobbiesListening from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import {
  createCoverAndExploreStarterDocument,
  createVocabBoardStarterDocument,
} from "@/lib/hotspots/fixtures/libraryStarters";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import type { WkeLibrarySeedDefinition } from "@/lib/wke-library/types";

async function packFromAuthoring(authoring: unknown) {
  const document = validateExploreHotspotsDocument(authoring);
  return {
    pack: wkeActivityToExploreHotspotsPayload(document),
    authoring: document,
  };
}

async function loadMiasMorningAuthoring() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "wke-library",
    "explore-hotspots",
    "mias-morning.wkeactivity.json",
  );
  const raw = await readFile(filePath, "utf8");
  return validateExploreHotspotsDocument(JSON.parse(raw));
}

/** Phase 1 curated Hotspots starters (Brady-authored). */
export const WKE_LIBRARY_HOTSPOT_SEEDS: WkeLibrarySeedDefinition[] = [
  {
    slug: "cover-and-explore",
    format: "explore_hotspots",
    title: "Cover + Explore starter",
    description:
      "Two scenes: a cover with title text animations, then an explore hotspot to fill in.",
    cefr: "A1",
    tags: ["multi-scene", "starter", "cover"],
    sortOrder: 10,
    build: () => packFromAuthoring(createCoverAndExploreStarterDocument()),
  },
  {
    slug: "vocab-board",
    format: "explore_hotspots",
    title: "Vocab board starter",
    description:
      "Single-scene board with three labels and three tap targets — swap in your art and words.",
    cefr: "A1",
    tags: ["vocabulary", "starter", "single-scene"],
    sortOrder: 20,
    build: () => packFromAuthoring(createVocabBoardStarterDocument()),
  },
  {
    slug: "hobbies-listening",
    format: "explore_hotspots",
    title: "What do you like doing?",
    description:
      "Single-scene listening activity — four hobby hotspots with short dialogues and I like + -ing frames.",
    cefr: "A1",
    tags: ["listening", "hobbies", "single-scene"],
    sortOrder: 30,
    build: () => packFromAuthoring(hobbiesListening),
  },
  {
    slug: "mias-morning",
    format: "explore_hotspots",
    title: "Mia's Morning!",
    description:
      "Multi-scene morning routine with cover entrance animations, sprite props, and scene-to-scene storytelling.",
    cefr: "A1",
    tags: ["multi-scene", "sprites", "cover-animation", "daily-routine"],
    sortOrder: 40,
    build: async () => packFromAuthoring(await loadMiasMorningAuthoring()),
  },
];

export const WKE_LIBRARY_SEED_DEFINITIONS: WkeLibrarySeedDefinition[] = [
  ...WKE_LIBRARY_HOTSPOT_SEEDS,
];

import { explorePayloadSchema } from "@/lib/lesson-schemas";
import { buildThemedGate } from "./build-gate";
import type { ExploreChapterDefinition } from "./types";

const BG =
  "https://placehold.co/1200x400/e9d5ff/4c1d95?text=Bedroom+run";

/**
 * Bedroom — mixed vocab (furniture, room, morning routine).
 * Not tied to a single vocab-set topic.
 */
export const BEDROOM_CHAPTER: ExploreChapterDefinition = {
  id: "bedroom",
  areaId: "bedroom",
  title: "My bedroom",
  subtitle: "Wake up and explore your room",
  order: 1,
  payload: explorePayloadSchema.parse({
    type: "interaction",
    subtype: "explore",
    explore_template: "default_run_v1",
    background_url: BG,
    world_length: 3000,
    scroll_speed_px_per_sec: 130,
    gates: [
      buildThemedGate({
        id: "bedroom_gate_1",
        targetWord: "bed",
        prompt: "You stretch after sleep. Spell the word!",
      }),
      buildThemedGate({
        id: "bedroom_gate_2",
        targetWord: "desk",
        prompt: "Sit at your desk. Spell the word!",
      }),
      buildThemedGate({
        id: "bedroom_gate_3",
        targetWord: "closet",
        prompt: "Open the closet. Spell the word!",
      }),
    ],
    encounter: {
      title: "Cozy corner",
      body_text:
        "You found a quiet spot by the window. Something shiny is tucked beside the rug!",
      image_url:
        "https://placehold.co/600x360/c4b5fd/4c1d95?text=Cozy+corner",
    },
  }),
};

import { explorePayloadSchema } from "@/lib/lesson-schemas";
import { buildThemedGate } from "./build-gate";
import type { ExploreChapterDefinition } from "./types";

const BG =
  "https://placehold.co/1200x400/fef08a/854d0e?text=Supermarket+run";

/**
 * Supermarket — mixed vocab (food, containers, shopping).
 */
export const SUPERMARKET_CHAPTER: ExploreChapterDefinition = {
  id: "supermarket",
  areaId: "supermarket",
  title: "Supermarket trip",
  subtitle: "Dash down the aisles before closing time",
  order: 3,
  payload: explorePayloadSchema.parse({
    type: "interaction",
    subtype: "explore",
    explore_template: "default_run_v1",
    background_url: BG,
    world_length: 3400,
    scroll_speed_px_per_sec: 145,
    gates: [
      buildThemedGate({
        id: "market_gate_1",
        targetWord: "apple",
        prompt: "Reach the fruit aisle. Spell the word!",
      }),
      buildThemedGate({
        id: "market_gate_2",
        targetWord: "milk",
        prompt: "The cold section is ahead. Spell it!",
      }),
      buildThemedGate({
        id: "market_gate_3",
        targetWord: "bread",
        prompt: "Fresh bread smells so good. Spell the word!",
      }),
    ],
    encounter: {
      title: "Checkout treasure",
      body_text:
        "You found a bonus basket behind the checkout. What words did you collect today?",
      image_url:
        "https://placehold.co/600x360/fde047/854d0e?text=Checkout",
    },
  }),
};

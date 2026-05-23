import { explorePayloadSchema } from "@/lib/lesson-schemas";
import { buildThemedGate } from "./build-gate";
import type { ExploreChapterDefinition } from "./types";

const BG =
  "https://placehold.co/1200x400/bfdbfe/1e3a8a?text=School+run";

/**
 * School — mixed vocab (classroom objects, people, actions).
 */
export const SCHOOL_CHAPTER: ExploreChapterDefinition = {
  id: "school",
  areaId: "school",
  title: "School day",
  subtitle: "Race through the halls to class",
  order: 2,
  payload: explorePayloadSchema.parse({
    type: "interaction",
    subtype: "explore",
    explore_template: "default_run_v1",
    background_url: BG,
    world_length: 3200,
    scroll_speed_px_per_sec: 140,
    gates: [
      buildThemedGate({
        id: "school_gate_1",
        targetWord: "book",
        prompt: "Grab your book before the bell! Spell it!",
      }),
      buildThemedGate({
        id: "school_gate_2",
        targetWord: "pencil",
        prompt: "Don't drop your pencil. Spell the word!",
      }),
      buildThemedGate({
        id: "school_gate_3",
        targetWord: "teacher",
        prompt: "Say hello to your teacher. Spell it!",
      }),
    ],
    encounter: {
      title: "Classroom surprise",
      body_text:
        "You made it to class! There is a note on the desk with a secret sticker spot.",
      image_url:
        "https://placehold.co/600x360/93c5fd/1e3a8a?text=Classroom",
    },
  }),
};

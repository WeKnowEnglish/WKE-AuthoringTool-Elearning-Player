/**
 * One-off: insert character "bridge" pages into lesson-my-favorite-toys story.
 * Run: node web/scripts/insert-toy-bridge-pages.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = "C:/Users/brady/Downloads/lesson-my-favorite-toys-screens.json";
const DEST = join(__dirname, "../content/story-imports/lesson-my-favorite-toys-screens.json");

const MEDIA =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

const U = {
  puppet: `${MEDIA}/e387d063-6428-4652-816a-f9bec87eb3d7-Puppet.png`,
  robot: `${MEDIA}/6afaac11-a124-47e1-a830-132c2abfc212-Robot.png`,
  teddy: `${MEDIA}/ad17c91b-fb1c-408e-8f38-ddbdee684212-Teddy_bear.png`,
  doll: `${MEDIA}/4c99ca79-d5b5-429b-968d-abcbf9b55d42-Doll.png`,
  car: `${MEDIA}/eb4f7066-f397-4dae-aabe-acd50b3946fa-Car.png`,
  kite: `${MEDIA}/b4b8964d-c19c-4db0-95c9-fa93f46cd9f9-Kite.png`,
  puzzle: `${MEDIA}/8898752e-ec6c-4b05-b23c-2ce5e7d67ec4-Puzzles.png`,
};

function insertAfter(pages, afterId, page) {
  const i = pages.findIndex((p) => p.id === afterId);
  if (i === -1) throw new Error(`Page not found: ${afterId}`);
  pages.splice(i + 1, 0, page);
}

const pageBridgePuppetRobot = {
  id: "page-bridge-puppet-robot",
  title: "Puppet & Robot",
  background_image_url:
    "https://placehold.co/1200x800/fef9c3/854d0e?text=On+the+way+to+the+park",
  image_fit: "cover",
  body_text: "Puppet and Robot can't wait for the park.",
  read_aloud_text: "Puppet and Robot can't wait for the park.",
  items: [
    {
      id: "br1-puppet",
      kind: "image",
      name: "Puppet",
      image_url: U.puppet,
      x_percent: 8,
      y_percent: 38,
      w_percent: 22,
      h_percent: 38,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: false,
      enter: { preset: "slide_left", duration_ms: 550 },
    },
    {
      id: "br1-robot",
      kind: "image",
      name: "Robot",
      image_url: U.robot,
      x_percent: 58,
      y_percent: 36,
      w_percent: 28,
      h_percent: 42,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: false,
      enter: { preset: "slide_right", duration_ms: 550 },
      path: {
        waypoints: [
          { x_percent: 62, y_percent: 40 },
          { x_percent: 58, y_percent: 36 },
        ],
        duration_ms: 900,
      },
    },
    {
      id: "br1-label",
      kind: "text",
      name: "label",
      text: "Puppet & Robot",
      text_color: "#713f12",
      text_size_px: 20,
      x_percent: 6,
      y_percent: 6,
      w_percent: 88,
      h_percent: 8,
      show_card: false,
      z_index: 4,
      show_on_start: true,
    },
  ],
  phases: [
    {
      id: "br1-a",
      name: "Puppet talks",
      is_start: true,
      next_phase_id: "br1-b",
      visible_item_ids: ["br1-label", "br1-puppet"],
      on_enter: [{ action: "show_item", "item_id": "br1-puppet" }],
      dialogue: {
        start: "Puppet: The sun is out! Let's go play outside with the scooters and the ball!",
      },
      completion: { type: "auto", delay_ms: 4200, next_phase_id: "br1-b" },
    },
    {
      id: "br1-b",
      name: "Robot talks",
      is_start: false,
      next_phase_id: "br1-c",
      visible_item_ids: ["br1-label", "br1-puppet", "br1-robot"],
      on_enter: [
        { action: "show_item", item_id: "br1-robot" },
        { action: "emphasis", item_id: "br1-robot", emphasis_preset: "grow", duration_ms: 550 },
      ],
      dialogue: {
        start: "Robot: Beep-boop! Outdoor toys — charging up for fun! Tap me!",
      },
      highlight_item_ids: ["br1-robot"],
      completion: {
        type: "on_click",
        target_item_id: "br1-robot",
        next_phase_id: "br1-c",
      },
    },
    {
      id: "br1-c",
      name: "Together",
      is_start: false,
      next_phase_id: null,
      visible_item_ids: ["br1-label", "br1-puppet", "br1-robot"],
      dialogue: {
        start: "Puppet: Race you to the grass! Robot: Affirmative! Turn the page for the park!",
      },
      highlight_item_ids: ["br1-puppet"],
      on_enter: [
        { action: "emphasis", item_id: "br1-puppet", emphasis_preset: "wobble", duration_ms: 500 },
      ],
      completion: { type: "on_click", target_item_id: "br1-puppet", next_phase_id: "br1-d" },
    },
    {
      id: "br1-d",
      name: "End",
      is_start: false,
      next_phase_id: null,
      completion: { type: "end_phase" },
    },
  ],
};

const pageBridgeTeddyDoll = {
  id: "page-bridge-teddy-doll",
  title: "Teddy & Doll",
  background_image_url:
    "https://placehold.co/1200x800/fce7f3/9d174d?text=Cozy+after+play",
  image_fit: "cover",
  body_text: "Soft friends after a busy day outside.",
  read_aloud_text: "Soft friends after a busy day outside.",
  items: [
    {
      id: "br2-teddy",
      kind: "image",
      name: "teddy",
      image_url: U.teddy,
      x_percent: 10,
      y_percent: 40,
      w_percent: 26,
      h_percent: 40,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: true,
      enter: { preset: "fade_in", duration_ms: 600 },
    },
    {
      id: "br2-doll",
      kind: "image",
      name: "doll",
      image_url: U.doll,
      x_percent: 58,
      y_percent: 38,
      w_percent: 26,
      h_percent: 42,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: true,
      enter: { preset: "slide_up", duration_ms: 550 },
    },
  ],
  phases: [
    {
      id: "br2-a",
      name: "Teddy",
      is_start: true,
      next_phase_id: "br2-b",
      dialogue: {
        start: "Teddy: Phew! You ran so fast with the ball and the kite. I'm ready to rest.",
      },
      completion: { type: "auto", delay_ms: 4500, next_phase_id: "br2-b" },
    },
    {
      id: "br2-b",
      name: "Doll",
      is_start: false,
      next_phase_id: "br2-c",
      dialogue: {
        start: "Doll: Come sit with us. The soft toys want to say hello. Tap me!",
      },
      highlight_item_ids: ["br2-doll"],
      on_enter: [{ action: "emphasis", item_id: "br2-doll", emphasis_preset: "grow", duration_ms: 500 }],
      completion: {
        type: "on_click",
        target_item_id: "br2-doll",
        next_phase_id: "br2-c",
      },
    },
    {
      id: "br2-c",
      name: "Teddy hug",
      is_start: false,
      next_phase_id: "br2-d",
      dialogue: {
        start: "Teddy: Tap me for a big teddy hug — then we match words to pictures!",
      },
      highlight_item_ids: ["br2-teddy"],
      on_enter: [{ action: "emphasis", item_id: "br2-teddy", emphasis_preset: "wobble", duration_ms: 600 }],
      completion: {
        type: "on_click",
        target_item_id: "br2-teddy",
        next_phase_id: "br2-d",
      },
    },
    {
      id: "br2-d",
      name: "End",
      is_start: false,
      next_phase_id: null,
      completion: { type: "end_phase" },
    },
  ],
};

const pageBridgeRobotGarage = {
  id: "page-bridge-robot-garage",
  title: "Robot's clue",
  background_image_url:
    "https://placehold.co/1200x800/e2e8f0/334155?text=Hallway+to+the+garage",
  image_fit: "cover",
  body_text: "A surprise is waiting.",
  read_aloud_text: "A surprise is waiting.",
  items: [
    {
      id: "br3-robot",
      kind: "image",
      name: "robot",
      image_url: U.robot,
      x_percent: 12,
      y_percent: 34,
      w_percent: 30,
      h_percent: 48,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: true,
      enter: { preset: "slide_left", duration_ms: 500 },
    },
    {
      id: "br3-car-teaser",
      kind: "image",
      name: "car teaser",
      image_url: U.car,
      x_percent: 62,
      y_percent: 48,
      w_percent: 22,
      h_percent: 28,
      z_index: 1,
      show_card: true,
      image_scale: 0.85,
      show_on_start: false,
      enter: { preset: "fade_in", duration_ms: 700 },
    },
  ],
  phases: [
    {
      id: "br3-a",
      name: "Robot mission",
      is_start: true,
      next_phase_id: "br3-b",
      visible_item_ids: ["br3-robot"],
      dialogue: {
        start: "Robot: Excellent matching! New mission: the garage. Something red is hiding under a blanket.",
      },
      completion: { type: "auto", delay_ms: 5200, next_phase_id: "br3-b" },
    },
    {
      id: "br3-b",
      name: "Peek",
      is_start: false,
      next_phase_id: "br3-c",
      visible_item_ids: ["br3-robot", "br3-car-teaser"],
      on_enter: [
        { action: "show_item", item_id: "br3-car-teaser" },
        { action: "emphasis", item_id: "br3-car-teaser", emphasis_preset: "grow", duration_ms: 500 },
      ],
      dialogue: {
        start: "Robot: Is that… a car? Tap the robot if you're ready to see!",
      },
      highlight_item_ids: ["br3-robot"],
      completion: {
        type: "on_click",
        target_item_id: "br3-robot",
        next_phase_id: "br3-c",
      },
    },
    {
      id: "br3-c",
      name: "End",
      is_start: false,
      next_phase_id: null,
      dialogue: {
        start: "Robot: Let's go! Turn the page for the big reveal.",
      },
      completion: { type: "end_phase" },
    },
  ],
};

const pageBridgeKiteFair = {
  id: "page-bridge-kite-fair",
  title: "At the fair",
  background_image_url:
    "https://placehold.co/1200x800/fef08a/854d0e?text=Fair+flags",
  image_fit: "cover",
  body_text: "The toy fair begins!",
  read_aloud_text: "The toy fair begins!",
  items: [
    {
      id: "br4-kite",
      kind: "image",
      name: "kite",
      image_url: U.kite,
      x_percent: 18,
      y_percent: 10,
      w_percent: 22,
      h_percent: 34,
      z_index: 3,
      show_card: true,
      image_scale: 1,
      show_on_start: true,
      enter: { preset: "slide_down", duration_ms: 600 },
      path: {
        waypoints: [
          { x_percent: 24, y_percent: 14 },
          { x_percent: 18, y_percent: 10 },
        ],
        duration_ms: 1600,
      },
    },
    {
      id: "br4-puzzle",
      kind: "image",
      name: "puzzle booth",
      image_url: U.puzzle,
      x_percent: 58,
      y_percent: 44,
      w_percent: 26,
      h_percent: 34,
      z_index: 2,
      show_card: true,
      image_scale: 1,
      show_on_start: false,
      enter: { preset: "grow", duration_ms: 500, grow_scale_percent: 105 },
    },
    {
      id: "br4-sign",
      kind: "text",
      name: "sign",
      text: "Toy Fair — match the words!",
      text_color: "#713f12",
      text_size_px: 18,
      x_percent: 8,
      y_percent: 82,
      w_percent: 84,
      h_percent: 10,
      show_card: false,
      z_index: 4,
      show_on_start: true,
    },
  ],
  phases: [
    {
      id: "br4-a",
      name: "Kite welcome",
      is_start: true,
      next_phase_id: "br4-b",
      visible_item_ids: ["br4-kite", "br4-sign"],
      dialogue: {
        start: "Kite: Whoosh! Welcome! Drag each word to the right toy at my fair!",
      },
      completion: { type: "auto", delay_ms: 4500, next_phase_id: "br4-b" },
    },
    {
      id: "br4-b",
      name: "Puzzle booth",
      is_start: false,
      next_phase_id: "br4-c",
      visible_item_ids: ["br4-kite", "br4-puzzle", "br4-sign"],
      on_enter: [
        { action: "show_item", item_id: "br4-puzzle" },
        { action: "emphasis", item_id: "br4-puzzle", emphasis_preset: "wobble", duration_ms: 500 },
      ],
      dialogue: {
        start: "Puzzle booth: I've got puzzles, balls, and dolls today. Tap the kite when you're ready!",
      },
      highlight_item_ids: ["br4-kite"],
      completion: {
        type: "on_click",
        target_item_id: "br4-kite",
        next_phase_id: "br4-c",
      },
    },
    {
      id: "br4-c",
      name: "End",
      is_start: false,
      next_phase_id: null,
      completion: { type: "end_phase" },
    },
  ],
};

const raw = readFileSync(SRC, "utf8");
const data = JSON.parse(raw);
const pages = data.screens[1].payload.pages;

insertAfter(pages, "page-colors", pageBridgePuppetRobot);
insertAfter(pages, "page-outdoor", pageBridgeTeddyDoll);
insertAfter(pages, "page-stuffed", pageBridgeRobotGarage);
insertAfter(pages, "page-toy-car", pageBridgeKiteFair);

// Freshen turn-page hints on surrounding pages
const byId = (id) => pages.find((p) => p.id === id);
const pOutdoor = byId("page-outdoor");
const pStuffed = byId("page-stuffed");
const pCar = byId("page-toy-car");
const pFair = byId("page-fair");

const lastPhaseDialogue = (page, phaseId, text) => {
  const ph = page.phases?.find((x) => x.id === phaseId);
  if (ph?.dialogue) ph.dialogue.start = text;
};

lastPhaseDialogue(
  pOutdoor,
  "p2-done",
  "Nice playing outside! Turn the page — Teddy and Doll want to talk to you.",
);
lastPhaseDialogue(
  pStuffed,
  "p3-end",
  "Great matching! Turn the page — Robot has a garage surprise.",
);
lastPhaseDialogue(
  pCar,
  "p4-end",
  "You said it! Turn the page — the kite welcomes you to the toy fair.",
);

writeFileSync(DEST, JSON.stringify(data, null, 2));
console.log("Wrote", DEST, "—", pages.length, "pages");

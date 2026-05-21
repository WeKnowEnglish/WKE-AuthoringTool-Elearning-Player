/**
 * Curated Supabase media URLs for A1 toys vocabulary (single set).
 * Ball is owned by school_activities; skip toys games banner asset.
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const TOYS_EVERYDAY_COVER_URL =
  `${BASE}/ad17c91b-fb1c-408e-8f38-ddbdee684212-Teddy_bear.png`;

export const TOYS_EVERYDAY_MEDIA_URLS: Partial<
  Record<
    | "doll"
    | "teddy_bear"
    | "blocks"
    | "kite"
    | "puppet"
    | "puzzles"
    | "balloon"
    | "legos"
    | "stacking_ring"
    | "yo_yo"
    | "action_figure"
    | "plush",
    string
  >
> = {
  doll: `${BASE}/4c99ca79-d5b5-429b-968d-abcbf9b55d42-Doll.png`,
  teddy_bear: `${BASE}/ad17c91b-fb1c-408e-8f38-ddbdee684212-Teddy_bear.png`,
  blocks: `${BASE}/dc3057b5-7679-479e-99cf-c9d75f387983-Blocks.png`,
  kite: `${BASE}/b4b8964d-c19c-4db0-95c9-fa93f46cd9f9-Kite.png`,
  puppet: `${BASE}/e387d063-6428-4652-816a-f9bec87eb3d7-Puppet.png`,
  puzzles: `${BASE}/8898752e-ec6c-4b05-b23c-2ce5e7d67ec4-Puzzles.png`,
  balloon: `${BASE}/adb1efc6-8892-4c96-99d8-afab61e5238e-Balloon.png`,
  legos: `${BASE}/67738e25-5087-4336-ad97-1ae597fefe09-Legos.png`,
  stacking_ring: `${BASE}/5bbb0adc-d716-41d9-bf62-ee03e7f641ce-Stacking_ring.png`,
  yo_yo: `${BASE}/649756d0-0f66-44a6-8b75-b41a5039ac22-Yo-yo.png`,
  action_figure: `${BASE}/7c84f4b9-8ac6-4b6f-be83-901bf337a3a3-action_figure.png`,
  plush: `${BASE}/6f1fee9b-7783-4614-886e-9d055e660c7b-stuffed_animals.png`,
};

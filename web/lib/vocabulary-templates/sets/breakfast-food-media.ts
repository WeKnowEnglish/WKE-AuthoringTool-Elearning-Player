/**
 * Curated Supabase media URLs for Breakfast Food (from media library metadata).
 * Words without a library asset keep placeholder art in the set file.
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const BREAKFAST_FOOD_COVER_URL = `${BASE}/9c8dade9-a589-430c-a952-e8d99eef1c8a-Food_Spelling_Cover.png`;

export const BREAKFAST_FOOD_MEDIA_URLS: Partial<
  Record<
    | "bread"
    | "milk"
    | "juice"
    | "eggs"
    | "pancakes"
    | "jam"
    | "cereal"
    | "rice"
    | "noodles"
    | "apple"
    | "banana"
    | "orange"
    | "water"
    | "coffee"
    | "tea",
    string
  >
> = {
  bread: `${BASE}/e17ed735-4459-4624-9e8a-78aea28c7e89-bread.png`,
  milk: `${BASE}/2757fff1-d86a-4682-8297-3d7bbd00bdc0-milk.png`,
  juice: `${BASE}/a7e25de6-6858-4850-99ee-e157234b6ef0-juice.png`,
  eggs: `${BASE}/cb0300fa-2a7c-43a6-aa00-c5f3196984de-egg.png`,
  pancakes: `${BASE}/0fa6e674-b74f-41a0-bd61-3ecd6057ff84-pancakes.png`,
  jam: `${BASE}/02c009b4-c3ad-49a4-890b-c9af9faaf941-jam.png`,
  rice: `${BASE}/94169301-1d0d-4f0b-b712-4eb32f53df01-rice.png`,
  noodles: `${BASE}/dc53ccad-8a39-48d5-b620-e7b39b44a9fa-noodles.png`,
  apple: `${BASE}/12b91b21-489c-465e-a279-8f50ffd090df-apple.png`,
  banana: `${BASE}/32be870f-3d39-427e-a2a2-7ee130a5ece3-bananas.png`,
  orange: `${BASE}/fe9f174d-d973-4920-81ac-09907e08e911-orange.png`,
};

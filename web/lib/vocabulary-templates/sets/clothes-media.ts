/**
 * Curated Supabase media URLs for A1 everyday clothes vocabulary.
 * From media_assets metadata (2026-04-30).
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const CLOTHES_EVERYDAY_COVER_URL =
  `${BASE}/ee3cde52-aa97-47b0-a89c-ccc19c20fb3c-jacket.png`;

export const CLOTHES_EVERYDAY_MEDIA_URLS: Partial<
  Record<
    | "shirt"
    | "jeans"
    | "shoes"
    | "socks"
    | "hat"
    | "jacket"
    | "sweater"
    | "shorts"
    | "skirt"
    | "dress"
    | "scarf"
    | "gloves"
    | "boots"
    | "rain_coat"
    | "rain_boots",
    string
  >
> = {
  shirt: `${BASE}/251d4316-672c-4fb3-826e-ac3f5ff383ce-shirt.png`,
  jeans: `${BASE}/44f7960d-e3d2-4fc9-a794-306917523593-jeans.png`,
  shoes: `${BASE}/4b2bb2b4-6262-46a2-b63e-6f356fafaea5-shoes.png`,
  socks: `${BASE}/f688f82d-6cbe-42ee-abca-09f1323e5011-socks.png`,
  hat: `${BASE}/58b9ebc3-2948-40e8-8c86-5dada581db83-hat.png`,
  jacket: `${BASE}/ee3cde52-aa97-47b0-a89c-ccc19c20fb3c-jacket.png`,
  sweater: `${BASE}/a29ebbb6-4d04-4def-afff-3b84235b7d2e-sweater.png`,
  shorts: `${BASE}/4cd0f44c-9d58-4889-ba85-3ee48157740b-shorts.png`,
  skirt: `${BASE}/d4ca87a1-479f-49d0-9906-836f2897a4bf-skirt.png`,
  dress: `${BASE}/ccf557b1-5a66-4728-8df4-97f48b6029f9-dress.png`,
  scarf: `${BASE}/ce4aca9e-5c69-4b23-906a-80c82e363eb5-scarf.png`,
  gloves: `${BASE}/c35dd9ba-8dec-49a5-a028-cc4c796e2093-gloves.png`,
  boots: `${BASE}/bca08087-9ec8-444c-816e-d36df47c15ba-boots.png`,
  rain_coat: `${BASE}/b469e666-7208-41c7-a195-02b512cc6578-rain_coat.png`,
  rain_boots: `${BASE}/575727b1-d926-4699-b386-22e0ccfc010d-rain_boots.png`,
};

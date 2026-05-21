/**
 * Curated Supabase media URLs for A1 weather vocabulary.
 * Sun is tagged `nature` in the library; other items use `weather`.
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

export const WEATHER_WORDS_COVER_URL =
  `${BASE}/145f6a2c-1e0e-4087-8947-0714cde29548-Featured_Image_Weather.png`;

export const WEATHER_WORDS_MEDIA_URLS: Partial<
  Record<
    | "sun"
    | "cloud"
    | "rain"
    | "snow"
    | "wind"
    | "storm"
    | "lightning"
    | "sunny"
    | "cloudy"
    | "rainy"
    | "snowy"
    | "windy"
    | "hot"
    | "cold"
    | "warm",
    string
  >
> = {
  sun: `${BASE}/79296a58-f198-4793-a1cd-4adeaf66c69a-sun.png`,
  cloud: `${BASE}/b598df79-665e-41cb-8929-be4b32c3f581-cloud.png`,
  rain: `${BASE}/ae262172-e266-4b65-908e-64d7cc43aab3-rain.png`,
  snow: `${BASE}/07553f4b-5cca-4db0-a38d-b1023ef680ac-snow.png`,
  wind: `${BASE}/39849b02-8a76-4257-bfbf-7afbc7a34190-wind.png`,
  storm: `${BASE}/b7a75da2-5914-44f6-8fa0-cbfa05317994-storm.png`,
  lightning: `${BASE}/59488aaf-2a5d-4aaa-917e-3cd95dc2f5bb-lightning.png`,
  sunny: `${BASE}/12c4e445-aea0-43fa-87a2-470aef1a1ca5-sunny.png`,
  cloudy: `${BASE}/37ef42d3-3484-49d2-b3de-f43fcb34794b-cloudy.png`,
  rainy: `${BASE}/df8469a8-f1c0-4ff4-8fa2-fd416c48bd4e-rainy.png`,
  snowy: `${BASE}/341aacd7-8df1-4968-bda3-2eeb88ba4337-snowy.png`,
  windy: `${BASE}/f1f3f33d-ab8e-46ec-a1fb-81497057136e-windy.png`,
  hot: `${BASE}/55c90e3e-84a7-4e9e-a32c-a5e1ce507f92-hot.png`,
  cold: `${BASE}/68bb9fba-9ea8-4dfa-a27a-0741efd59711-cold.png`,
  warm: `${BASE}/ec55d94e-f528-4e75-ab0a-510f8064c6f7-warm.png`,
};

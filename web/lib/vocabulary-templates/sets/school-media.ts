/**
 * Curated Supabase media URLs for A1 school vocabulary sets.
 * School-tagged assets plus cross-category pulls (clothes, actions, food, home, toys, misc).
 */
const BASE =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f";

/** Hub cover and phase-2 places set cover (classroom). */
export const SCHOOL_HUB_COVER_URL =
  `${BASE}/7f382c4c-753a-4b79-8655-7adfc72ba675-classroom.png`;

export const SCHOOL_SUPPLIES_COVER_URL =
  `${BASE}/07b792a3-7f89-48ff-ab18-98e2c94fedef-pencil.png`;

export const SCHOOL_ACTIVITIES_COVER_URL =
  `${BASE}/6d34c662-0099-455d-a0ae-7510c8526d0b-write.png`;

export const SCHOOL_SUPPLIES_MEDIA_URLS: Partial<
  Record<
    | "pencil"
    | "pen"
    | "eraser"
    | "crayon"
    | "markers"
    | "backpack"
    | "maths"
    | "english"
    | "art"
    | "table"
    | "lunchbox",
    string
  >
> = {
  pencil: `${BASE}/07b792a3-7f89-48ff-ab18-98e2c94fedef-pencil.png`,
  pen: `${BASE}/62840f62-58a3-4c9d-9aca-113cd5996254-pen.png`,
  eraser: `${BASE}/dffd3ec0-66a7-4c8f-b9f6-1962e42092dc-eraser.png`,
  crayon: `${BASE}/ac03f5ca-3568-4c22-ad9d-2f1cf615a611-crayon.png`,
  markers: `${BASE}/514a04de-4834-4f1f-bb26-3ce305e94e10-markers.png`,
  backpack: `${BASE}/4bc3ee0e-2e5f-4430-bf8d-6ec9c27036ae-backpack.png`,
  maths: `${BASE}/f6c5726c-2dc8-4ac9-906e-4d81f01fabb3-maths.png`,
  english: `${BASE}/ae46dc06-7509-4763-a4ef-2169cdf1934a-English.png`,
  art: `${BASE}/39ce33a1-a6cc-4d41-8d47-3434855af5e1-art.png`,
  table: `${BASE}/ae2dc393-4997-4fd3-a5a3-17fba9d37246-table.png`,
  lunchbox: `${BASE}/a7f04e94-211e-4617-9eb8-f4a0ce80abfb-lunchbox.png`,
};

export const SCHOOL_ACTIVITIES_MEDIA_URLS: Partial<
  Record<
    | "write"
    | "draw"
    | "paint"
    | "play"
    | "sing"
    | "ball"
    | "guitar",
    string
  >
> = {
  write: `${BASE}/6d34c662-0099-455d-a0ae-7510c8526d0b-write.png`,
  draw: `${BASE}/48ae3038-e0e3-49ee-ba03-1cf32aa509ff-draw.png`,
  paint: `${BASE}/e0d40fdf-573e-43ba-b3ce-36272123af30-paint.png`,
  play: `${BASE}/4a9e2c0b-eb47-4a0b-9d15-33434e3be7c0-play.png`,
  sing: `${BASE}/07cb68b7-551c-4f7f-983e-9803f0540def-sing.png`,
  ball: `${BASE}/b8e254a3-cd7b-4a06-a2bd-fe4d252678e4-Ball.png`,
  guitar: `${BASE}/363cb0a7-f224-41e9-8540-437f667ebda8-guitar.png`,
};

/** Phase 2 (school_places): add school, library, playground, gym, desk, teacher, student URLs here. */

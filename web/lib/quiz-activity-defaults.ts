/** Default hero image for activity-library quiz start and synthetic “congratulations” end screens. */
export const DEFAULT_QUIZ_BOOKEND_IMAGE_URL =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/febeaf77-311d-44d0-8af3-a9e63b6afb1f-1.jpg";

/**
 * Base energy chunk (1/30 of the bar). Each correct adds `base × streak` where `streak` is the
 * new consecutive-correct count (1 after a wrong or first correct, then 2, 3, …).
 */
export const ACTIVITY_QUIZ_ENERGY_BASE = 1 / 30;

/** Gold granted each time the energy bar completes a full cycle. */
export const ACTIVITY_QUIZ_ENERGY_GOLD = 10;

export const ACTIVITY_QUIZ_ENERGY_XP = 0;

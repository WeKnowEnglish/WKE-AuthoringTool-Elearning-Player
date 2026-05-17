/** Thumbs shown on opinion/meal T/F (sentence ↔ gesture, not food picture). */
export const VOCAB_TF_THUMBS_UP_URL =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/799334da-2b6d-448e-ae3f-62287a8eadfd-Thumbs_up.png";

export const VOCAB_TF_THUMBS_DOWN_URL =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/bc1926d1-8360-4e9b-b43c-79080102dcd0-Thumbs_down.png";

export type VocabTfThumbCue = "up" | "down";

export function vocabTfThumbImageUrl(cue: VocabTfThumbCue): string {
  return cue === "up" ? VOCAB_TF_THUMBS_UP_URL : VOCAB_TF_THUMBS_DOWN_URL;
}

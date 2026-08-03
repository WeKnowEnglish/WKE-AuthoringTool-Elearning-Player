import { z } from "zod";

export const comicElementKinds = [
  "speech",
  "thought",
  "narration",
  "caption",
  "sfx",
  "panel_number",
  "title",
  "subtitle",
] as const;

export const comicSpeakerIds = [
  "narrator",
  "mia",
  "zara",
  "leo",
  "ethan",
  "keelan",
  "grandpa_minh",
] as const;

export type ComicElementKind = (typeof comicElementKinds)[number];
export type ComicSpeakerId = (typeof comicSpeakerIds)[number];

const boundsSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
});

const tailSchema = z.object({
  side: z.enum(["top", "right", "bottom", "left"]),
  offset: z.number().min(5).max(95).default(50),
});

export const comicLetteringElementSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(comicElementKinds),
  text: z.string().max(500),
  speakerId: z.enum(comicSpeakerIds).optional(),
  bounds: boundsSchema,
  tail: tailSchema.optional(),
  readOrder: z.number().int().min(1).max(100).optional(),
  fontScale: z.number().min(0.5).max(2).default(1),
  vocabularyIds: z.array(z.string().min(1).max(80)).default([]),
  emphasis: z.enum(["normal", "shout", "whisper"]).default("normal"),
});

export const comicVocabularyEntrySchema = z.object({
  id: z.string().min(1).max(80),
  term: z.string().min(1).max(80),
  definition: z.string().min(1).max(240),
  example: z.string().max(300).optional(),
});

export const comicCastEntrySchema = z.object({
  speakerId: z.enum(["mia", "zara", "leo", "ethan", "keelan"]),
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().min(1).max(180),
});

export const comicPageOverlaySchema = z.object({
  version: z.literal(1),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  altText: z.string().min(1).max(1000),
  elements: z.array(comicLetteringElementSchema).max(80),
  cast: z.array(comicCastEntrySchema).max(6).default([]),
  vocabulary: z.array(comicVocabularyEntrySchema).max(24).default([]),
  discussionPrompt: z.string().max(500).optional(),
});

export type ComicLetteringElement = z.infer<typeof comicLetteringElementSchema>;
export type ComicVocabularyEntry = z.infer<typeof comicVocabularyEntrySchema>;
export type ComicCastEntry = z.infer<typeof comicCastEntrySchema>;
export type ComicPageOverlay = z.infer<typeof comicPageOverlaySchema>;

export function parseComicPageOverlay(value: unknown): ComicPageOverlay | null {
  const result = comicPageOverlaySchema.safeParse(value);
  return result.success ? result.data : null;
}

export function createEmptyComicOverlay(width = 1024, height = 1536): ComicPageOverlay {
  return {
    version: 1,
    canvas: { width, height },
    altText: "Comic page artwork",
    elements: [],
    cast: [],
    vocabulary: [],
  };
}

export function getReadableComicElements(overlay: ComicPageOverlay | null) {
  if (!overlay) return [];
  return overlay.elements
    .filter((element) => element.readOrder != null && element.text.trim())
    .sort((a, b) => (a.readOrder ?? 0) - (b.readOrder ?? 0));
}

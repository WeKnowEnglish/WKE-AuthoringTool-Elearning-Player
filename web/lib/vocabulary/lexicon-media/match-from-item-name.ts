/**
 * Match a media item name (or filename stem) to Primary dictionary lemmas.
 * Shared by upload auto-link and the media match review queue.
 */

import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

const SCENEISH = new Set([
  "scene",
  "background",
  "classroom",
  "room",
  "setting",
  "explore",
  "hotspot",
  "hotspots",
  "backdrop",
  "sprite",
  "prop",
]);

const NO_SINGULARIZE = new Set([
  "shorts",
  "pants",
  "jeans",
  "glasses",
  "scissors",
  "clothes",
  "tweezers",
  "pliers",
  "binoculars",
  "pajamas",
  "pyjamas",
  "trousers",
  "overalls",
  "tongs",
  "leggings",
  "octopus",
  "platypus",
  "walrus",
  "bus",
  "cactus",
  "fungus",
  "buffalo",
  "moose",
  "deer",
  "sheep",
  "shrimp",
]);

const IRREGULAR_SINGULAR: Record<string, string> = {
  feet: "foot",
  teeth: "tooth",
  mice: "mouse",
  geese: "goose",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  leaves: "leaf",
  knives: "knife",
  wolves: "wolf",
  shelves: "shelf",
  loaves: "loaf",
  calves: "calf",
  halves: "half",
  lives: "life",
  wives: "wife",
  strawberries: "strawberry",
  cookies: "cookie",
  pancakes: "pancake",
  noodles: "noodle",
  puzzles: "puzzle",
  markers: "marker",
  mittens: "mitten",
  sandals: "sandal",
  sneakers: "sneaker",
  boots: "boot",
  chips: "chip",
  nuts: "nut",
  lips: "lip",
  lungs: "lung",
  organs: "organ",
  legos: "lego",
};

const COLOR_LEMMAS = new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "black",
  "white",
  "gray",
  "grey",
  "brown",
]);

export type LexiconMatchCandidate = {
  id: string;
  lemma: string;
  pos: string;
  normalizedLemma: string;
};

export type MediaLexiconMatchKind = "exact" | "singular" | "ambiguous" | "none" | "skipped";
export type MediaLexiconMatchConfidence = "high" | "medium" | "low" | "none";

export type MediaLexiconMatchResult = {
  surface: string;
  matchKind: MediaLexiconMatchKind;
  confidence: MediaLexiconMatchConfidence;
  /** Safe to auto-link without review. */
  autoLink: boolean;
  chosen: LexiconMatchCandidate | null;
  candidates: LexiconMatchCandidate[];
  reason: string;
};

export function normalizeMediaSurface(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function simpleSingular(word: string): string {
  const w = normalizeMediaSurface(word);
  if (IRREGULAR_SINGULAR[w]) return IRREGULAR_SINGULAR[w];
  if (NO_SINGULARIZE.has(w)) return w;
  if (/[aeiou]ies$/i.test(w) && w.length > 4) return w.slice(0, -1);
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (
    w.endsWith("ses") ||
    w.endsWith("xes") ||
    w.endsWith("zes") ||
    w.endsWith("ches") ||
    w.endsWith("shes")
  ) {
    return w.slice(0, -2);
  }
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

/** Derive a display/item name from an original filename when meta_item_name is empty. */
export function itemNameFromFilename(filename: string): string | null {
  const base = String(filename || "")
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]+$/, "")
    .trim();
  const n = normalizeMediaSurface(base);
  if (!n || n.length < 2) return null;
  // Title-case first letter of each token for display
  return n
    .split(" ")
    .map((t) => (t ? t[0]!.toUpperCase() + t.slice(1) : t))
    .join(" ");
}

export function isSceneishMedia(input: {
  metaItemName?: string | null;
  originalFilename?: string | null;
  metaTags?: string[] | null;
  metaCategories?: string[] | null;
}): boolean {
  const cats = (input.metaCategories || []).map((s) => normalizeMediaSurface(String(s)));
  const tags = (input.metaTags || []).map((s) => normalizeMediaSurface(String(s)));
  if (cats.some((c) => ["scene", "sprite", "background", "prop"].includes(c))) return true;
  if (tags.some((t) => ["scene", "sprite", "background", "explore_hotspots"].includes(t))) {
    return true;
  }
  const blob = [input.metaItemName, input.originalFilename, ...cats, ...tags]
    .filter(Boolean)
    .map((x) => normalizeMediaSurface(String(x)))
    .join(" ");
  for (const s of SCENEISH) {
    if (blob.split(" ").includes(s)) return true;
  }
  return false;
}

function pickBest(candidates: LexiconMatchCandidate[], matchKey: string): LexiconMatchCandidate {
  if (candidates.length === 1) return candidates[0]!;
  const byPos = (pos: string) => candidates.find((c) => c.pos === pos);
  if (COLOR_LEMMAS.has(matchKey) && byPos("adjective")) return byPos("adjective")!;
  return byPos("noun") || byPos("adjective") || byPos("verb") || candidates[0]!;
}

function indexByLemma(): Map<string, LexiconMatchCandidate[]> {
  const map = new Map<string, LexiconMatchCandidate[]>();
  for (const e of getPrimaryVocabularySearchEntries()) {
    const key = normalizeMediaSurface(e.normalizedLemma || e.lemma);
    if (!key) continue;
    const row: LexiconMatchCandidate = {
      id: e.id,
      lemma: e.lemma,
      pos: e.pos,
      normalizedLemma: key,
    };
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

let cachedIndex: Map<string, LexiconMatchCandidate[]> | null = null;

function getIndex(): Map<string, LexiconMatchCandidate[]> {
  if (!cachedIndex) cachedIndex = indexByLemma();
  return cachedIndex;
}

/** Test helper / hot-reload safety. */
export function resetMediaLexiconMatchIndexCache(): void {
  cachedIndex = null;
}

/**
 * Resolve a surface to dictionary candidates.
 * Auto-link only when single-word and exactly one POS candidate (unambiguous).
 */
export function matchMediaSurfaceToLexicon(rawSurface: string): MediaLexiconMatchResult {
  const surface = normalizeMediaSurface(rawSurface);
  if (!surface) {
    return {
      surface: "",
      matchKind: "skipped",
      confidence: "none",
      autoLink: false,
      chosen: null,
      candidates: [],
      reason: "Empty surface",
    };
  }

  const index = getIndex();
  const isMulti = surface.includes(" ");

  // Exact phrase / word
  const exactHits = index.get(surface) ?? [];
  if (exactHits.length === 1) {
    return {
      surface,
      matchKind: "exact",
      confidence: "high",
      autoLink: true,
      chosen: exactHits[0]!,
      candidates: exactHits,
      reason: `Exact match ${exactHits[0]!.id}`,
    };
  }
  if (exactHits.length > 1) {
    const chosen = pickBest(exactHits, surface);
    return {
      surface,
      matchKind: "ambiguous",
      confidence: "medium",
      autoLink: false,
      chosen,
      candidates: exactHits,
      reason: `Ambiguous POS for "${surface}"`,
    };
  }

  // Singular stem (single token only)
  if (!isMulti) {
    const singular = simpleSingular(surface);
    if (singular !== surface) {
      const singularHits = index.get(singular) ?? [];
      if (singularHits.length === 1) {
        return {
          surface,
          matchKind: "singular",
          confidence: "high",
          autoLink: true,
          chosen: singularHits[0]!,
          candidates: singularHits,
          reason: `Singularized "${surface}" → "${singular}"`,
        };
      }
      if (singularHits.length > 1) {
        const chosen = pickBest(singularHits, singular);
        return {
          surface,
          matchKind: "ambiguous",
          confidence: "medium",
          autoLink: false,
          chosen,
          candidates: singularHits,
          reason: `Ambiguous POS for singular "${singular}"`,
        };
      }
    }
  }

  // Multi-word with no exact phrase: queue for review (don't guess head noun on upload)
  if (isMulti) {
    return {
      surface,
      matchKind: "none",
      confidence: "none",
      autoLink: false,
      chosen: null,
      candidates: [],
      reason: `Multi-word phrase "${surface}" has no exact dictionary match`,
    };
  }

  return {
    surface,
    matchKind: "none",
    confidence: "none",
    autoLink: false,
    chosen: null,
    candidates: [],
    reason: `No dictionary match for "${surface}"`,
  };
}

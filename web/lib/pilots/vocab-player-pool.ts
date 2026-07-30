import type { VocabListEntry, VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import {
  ANIMALS_VOCAB_SET_MENU,
  BODY_VOCAB_SET_MENU,
  FOOD_VOCAB_SET_MENU,
  getVocabularySet,
  JOBS_VOCAB_SET_MENU,
  SCHOOL_VOCAB_SET_MENU,
  VOCAB_TOP_MENU,
  type VocabMenuEntry,
} from "@/lib/vocabulary-templates/registry";
import type {
  VocabSetId,
  VocabWord,
  VocabWordCloze,
  VocabularySetDefinition,
} from "@/lib/vocabulary-templates/types";
import {
  ANIMAL_VOCAB_SET_IDS,
  BODY_VOCAB_SET_IDS,
  FOOD_VOCAB_SET_IDS,
  isVocabSetId,
  JOBS_VOCAB_SET_IDS,
  SCHOOL_VOCAB_SET_IDS,
} from "@/lib/vocabulary-templates/types";
import { VOCAB_PLAYER_SAMPLE_SIZE } from "@/lib/pilots/compile-vocab-player-run-constants";

export type VocabPlayerHubId = "food" | "animals" | "school" | "body" | "jobs";

/** Theme key for a bank: hub (all subtopics) or a single set. */
export type VocabPlayerThemeId = `hub:${VocabPlayerHubId}` | `set:${VocabSetId}`;

export type VocabPlayerThemeOption = {
  id: VocabPlayerThemeId;
  label: string;
  kind: "hub" | "set";
  /** Parent hub when this is a subtopic set. */
  hubId?: VocabPlayerHubId;
  coverImageUrl?: string;
  subtitle?: string;
  setIds: VocabSetId[];
  /** Full list size (includes words missing images). */
  listCount: number;
  /** Words with real (non-placeholder) images — quiz-eligible. */
  imageReadyCount: number;
  missingLemmas: string[];
  /** True when image-ready count ≥ sample size (default 6). */
  quizReady: boolean;
};

const HUB_SET_IDS: Record<VocabPlayerHubId, readonly VocabSetId[]> = {
  food: FOOD_VOCAB_SET_IDS,
  animals: ANIMAL_VOCAB_SET_IDS,
  school: SCHOOL_VOCAB_SET_IDS,
  body: BODY_VOCAB_SET_IDS,
  jobs: JOBS_VOCAB_SET_IDS,
};

const HUB_SUBTOPIC_MENUS: Record<
  VocabPlayerHubId,
  readonly { id: VocabSetId; label: string }[]
> = {
  food: FOOD_VOCAB_SET_MENU,
  animals: ANIMALS_VOCAB_SET_MENU,
  school: SCHOOL_VOCAB_SET_MENU,
  body: BODY_VOCAB_SET_MENU,
  jobs: JOBS_VOCAB_SET_MENU,
};

function firstCloze(word: VocabWord): VocabWordCloze | undefined {
  return Array.isArray(word.cloze) ? word.cloze[0] : word.cloze;
}

function glossFromWord(word: VocabWord): string {
  const template = firstCloze(word)?.template?.trim();
  if (template) {
    return template.replace(/__\d+__/g, "___");
  }
  return `Learn the word “${word.lemma}”.`;
}

function exampleFromWord(word: VocabWord): string {
  const cloze = firstCloze(word);
  const template = cloze?.template?.trim();
  if (template) {
    const answer = cloze?.acceptable?.[0] ?? word.lemma;
    return template.replace(/__\d+__/g, answer);
  }
  return `I like ${word.lemma}.`;
}

function primaryWordToEntry(word: VocabWord, setId: string): VocabListEntry {
  return {
    id: `${setId}:${word.id}`,
    word: word.lemma,
    definitionEn: glossFromWord(word),
    example: exampleFromWord(word),
    imageUrl: word.imageUrl,
    imageFit: "contain",
  };
}

/** True when the entry has a usable illustration (not a placehold.co stub). */
export function isVocabEntryImageReady(entry: VocabListEntry): boolean {
  const url = entry.imageUrl?.trim() ?? "";
  return Boolean(url) && !url.includes("placehold.co");
}

export function filterImageReadyEntries(entries: VocabListEntry[]): VocabListEntry[] {
  return entries.filter(isVocabEntryImageReady);
}

function dedupeEntries(entries: VocabListEntry[]): VocabListEntry[] {
  const seen = new Set<string>();
  const out: VocabListEntry[] = [];
  for (const entry of entries) {
    const key = entry.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

/** Full themed list (includes words still waiting on images). */
export function buildPoolFromVocabSets(
  setIds: readonly VocabSetId[],
  options?: { id?: string; name?: string },
): VocabularyListDocument {
  const primaryEntries: VocabListEntry[] = [];
  for (const setId of setIds) {
    const set = getVocabularySet(setId);
    for (const word of set.words) {
      primaryEntries.push(primaryWordToEntry(word, setId));
    }
  }
  const entries = dedupeEntries(primaryEntries);
  return {
    version: 1,
    kind: "vocabulary-list",
    id: options?.id ?? `vocab-player-${setIds.join("-")}`,
    name: options?.name ?? `Vocabulary (${setIds.join(", ")})`,
    cefr: "A1",
    entries,
  };
}

/**
 * Pool from a (possibly media-enriched) Primary set definition.
 * Uses bare word ids so mastery / vocabWordsById stay aligned on Primary.
 */
export function buildPoolFromVocabularySetDefinition(
  def: VocabularySetDefinition,
): VocabularyListDocument {
  const entries = dedupeEntries(
    def.words.map((word) => ({
      id: word.id,
      word: word.lemma,
      definitionEn: glossFromWord(word),
      example: exampleFromWord(word),
      imageUrl: word.imageUrl,
      imageFit: "contain" as const,
    })),
  );
  return {
    version: 1,
    kind: "vocabulary-list",
    id: `vocab-player-set-${def.id}`,
    name: def.title,
    cefr: "A1",
    entries,
  };
}

/** Static image-readiness for a single Primary set (before live media load). */
export function describeVocabSetImageReadiness(
  setId: VocabSetId,
  minQuizSize = VOCAB_PLAYER_SAMPLE_SIZE,
): {
  listCount: number;
  imageReadyCount: number;
  missingLemmas: string[];
  quizReady: boolean;
} {
  const stats = describeSetIds([setId]);
  return {
    ...stats,
    quizReady: stats.imageReadyCount >= minQuizSize,
  };
}

export function isVocabSetQuizReady(
  setId: VocabSetId,
  minQuizSize = VOCAB_PLAYER_SAMPLE_SIZE,
): boolean {
  return describeVocabSetImageReadiness(setId, minQuizSize).quizReady;
}

export function parseVocabPlayerThemeId(raw: string): VocabPlayerThemeId | null {
  if (raw.startsWith("hub:")) {
    const hubId = raw.slice(4) as VocabPlayerHubId;
    if (hubId in HUB_SET_IDS) return `hub:${hubId}`;
    return null;
  }
  if (raw.startsWith("set:")) {
    const setId = raw.slice(4);
    if (!isVocabSetId(setId)) return null;
    return `set:${setId}`;
  }
  return null;
}

export function setIdsForTheme(themeId: VocabPlayerThemeId): VocabSetId[] {
  if (themeId.startsWith("hub:")) {
    const hubId = themeId.slice(4) as VocabPlayerHubId;
    return [...HUB_SET_IDS[hubId]];
  }
  return [themeId.slice(4) as VocabSetId];
}

function describeSetIds(setIds: readonly VocabSetId[]): {
  listCount: number;
  imageReadyCount: number;
  missingLemmas: string[];
} {
  const pool = buildPoolFromVocabSets(setIds);
  const missingLemmas: string[] = [];
  let imageReadyCount = 0;
  for (const entry of pool.entries) {
    if (isVocabEntryImageReady(entry)) imageReadyCount += 1;
    else missingLemmas.push(entry.word);
  }
  return {
    listCount: pool.entries.length,
    imageReadyCount,
    missingLemmas,
  };
}

function hubFromMenu(entry: Extract<VocabMenuEntry, { kind: "hub" }>): VocabPlayerThemeOption {
  const setIds = [...HUB_SET_IDS[entry.hubId]];
  const stats = describeSetIds(setIds);
  return {
    id: `hub:${entry.hubId}`,
    label: entry.label,
    kind: "hub",
    hubId: entry.hubId,
    coverImageUrl: entry.coverImageUrl,
    subtitle: entry.subtitle,
    setIds,
    ...stats,
    quizReady: stats.imageReadyCount >= 6,
  };
}

function setThemeOption(
  setId: VocabSetId,
  label: string,
  hubId?: VocabPlayerHubId,
): VocabPlayerThemeOption {
  const set = getVocabularySet(setId);
  const stats = describeSetIds([setId]);
  return {
    id: `set:${setId}`,
    label,
    kind: "set",
    hubId,
    coverImageUrl: set.coverImageUrl,
    subtitle: `${stats.imageReadyCount} pictures ready · ${stats.listCount} words`,
    setIds: [setId],
    ...stats,
    quizReady: stats.imageReadyCount >= 6,
  };
}

/** Top-level lobby themes (hubs + standalone sets), matching Primary vocab menu. */
export function listVocabPlayerTopThemes(minQuizSize = 6): VocabPlayerThemeOption[] {
  const out: VocabPlayerThemeOption[] = [];
  for (const entry of VOCAB_TOP_MENU) {
    if (entry.kind === "hub") {
      const theme = hubFromMenu(entry);
      out.push({
        ...theme,
        quizReady: theme.imageReadyCount >= minQuizSize,
        subtitle: `${entry.subtitle} · ${theme.imageReadyCount}/${theme.listCount} pictures`,
      });
    } else {
      out.push(setThemeOption(entry.id, entry.label));
    }
  }
  return out;
}

/** Subtopic chips under a hub. */
export function listVocabPlayerHubSubtopics(
  hubId: VocabPlayerHubId,
  minQuizSize = 6,
): VocabPlayerThemeOption[] {
  return HUB_SUBTOPIC_MENUS[hubId].map((row) => {
    const theme = setThemeOption(row.id, row.label, hubId);
    return {
      ...theme,
      quizReady: theme.imageReadyCount >= minQuizSize,
    };
  });
}

export function buildVocabPlayerThemePool(
  themeId: VocabPlayerThemeId,
): VocabularyListDocument {
  const setIds = setIdsForTheme(themeId);
  const label =
    themeId.startsWith("hub:")
      ? themeId.slice(4)
      : getVocabularySet(themeId.slice(4) as VocabSetId).title;
  return buildPoolFromVocabSets(setIds, {
    id: `vocab-player-theme-${themeId.replace(":", "-")}`,
    name: `Vocabulary · ${label}`,
  });
}

/**
 * Default pool for tests / legacy callers: all Primary sets (full lists).
 * Quiz compile should still filter to image-ready words.
 */
export function buildVocabPlayerPoolDocument(): VocabularyListDocument {
  const setIds = VOCAB_TOP_MENU.flatMap((entry) => {
    if (entry.kind === "hub") return [...HUB_SET_IDS[entry.hubId]];
    return [entry.id];
  });
  const unique: VocabSetId[] = [];
  const seen = new Set<string>();
  for (const id of setIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return buildPoolFromVocabSets(unique, {
    id: "vocab-player-pool",
    name: "Vocabulary player pool",
  });
}

export function vocabPlayerPoolSize(): number {
  return buildVocabPlayerPoolDocument().entries.length;
}

export function vocabPlayerImageReadyCount(pool?: VocabularyListDocument): number {
  const doc = pool ?? buildVocabPlayerPoolDocument();
  return filterImageReadyEntries(doc.entries).length;
}

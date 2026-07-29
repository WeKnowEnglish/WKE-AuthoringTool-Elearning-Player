import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import {
  exportGamesFlashcardsForLessonPlayer,
  validateGamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/flashcards";
import {
  exportGamesLetterMixupForLessonPlayer,
  validateGamesLetterMixupAuthoringDocument,
} from "@/lib/activity-builder/games/letter-mixup";
import {
  exportGamesMcQuizForLessonPlayer,
  validateGamesAuthoringDocument,
} from "@/lib/activity-builder/games/mc-quiz";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { validateVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import {
  getActivityLibraryEntry,
  readVocabularyListFromLibraryEntry,
} from "@/lib/activity-library";
import { enrichVocabListMediaFromLexicon } from "@/lib/actions/lexicon-media";
import {
  defaultFlashcardsSettings,
  defaultLetterMixupSettings,
  defaultListenAndChooseSettings,
  defaultExploreHotspotsSettings,
  defaultLanguageInFocusSettings,
  defaultMultipleChoiceSettings,
  vocabFormatForKind,
} from "@/lib/learning-tracks/composition";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";
import type {
  LearningTrackBeatInstance,
  LearningTrackBeatKind,
  LearningTrackFixtureId,
  LearningTrackFlashcardsSettings,
  LearningTrackLetterMixupSettings,
  LearningTrackLibraryFormat,
  LearningTrackListenAndChooseSettings,
  LearningTrackExploreHotspotsSettings,
  LearningTrackLanguageInFocusSettings,
  LearningTrackMultipleChoiceSettings,
  LearningTrackScreenPayload,
  LearningTrackVocabCompileFormat,
} from "@/lib/learning-tracks/composition-types";
import { HOBBIES_DEFAULT_VOCAB_LIST_ID } from "@/lib/learning-tracks/composition-types";
import {
  applyMcItemOverlays,
} from "@/lib/learning-tracks/mc-item-overlays";
import { applyListenItemOverlays } from "@/lib/learning-tracks/listen-item-overlays";
import { applyHotspotTurnOverlays } from "@/lib/learning-tracks/hotspot-turn-overlays";
import { applyLifExampleOverlays } from "@/lib/learning-tracks/lif-example-overlays";
import hobbiesHotspotsScreen from "@/lib/learning-tracks/fixtures/hobbies-hotspots.screen.json";
import hobbiesLikeIngScreen from "@/lib/learning-tracks/fixtures/hobbies-like-ing.screen.json";
import hobbiesFlashcardsPack from "@/lib/learning-tracks/fixtures/hobbies-flashcards.lessonplayer.json";
import hobbiesListenPack from "@/lib/learning-tracks/fixtures/hobbies-listen-choose.lessonplayer.json";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";

export function asScreen(value: unknown, label: string): LearningTrackScreenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} fixture must be an object.`);
  }
  const record = value as Record<string, unknown>;
  if (record.type !== "interaction" || typeof record.subtype !== "string") {
    throw new Error(`${label} fixture must be an interaction screen.`);
  }
  return record as LearningTrackScreenPayload;
}

export function screensFromGamesPack(
  pack: unknown,
  label: string,
): LearningTrackScreenPayload[] {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new Error(`${label} pack must be an object.`);
  }
  const screens = (pack as { screens?: unknown }).screens;
  if (!Array.isArray(screens) || screens.length < 1) {
    throw new Error(`${label} pack needs screens.`);
  }
  return screens.map((screen, index) => asScreen(screen, `${label} screen ${index + 1}`));
}

export function loadFixture(fixtureId: LearningTrackFixtureId): LearningTrackScreenPayload[] {
  switch (fixtureId) {
    case "hobbies-hotspots":
      return [asScreen(hobbiesHotspotsScreen, "Hobbies hotspots")];
    case "hobbies-like-ing":
      return [asScreen(hobbiesLikeIngScreen, "Hobbies Language in Focus")];
    case "hobbies-flashcards":
      return screensFromGamesPack(hobbiesFlashcardsPack, "Hobbies flashcards");
    case "hobbies-listen-choose":
      return screensFromGamesPack(hobbiesListenPack, "Hobbies listen and choose");
    default: {
      const _exhaustive: never = fixtureId;
      throw new Error(`Unknown fixture: ${_exhaustive}`);
    }
  }
}

export function libraryFormatForBeatKind(
  kind: LearningTrackBeatKind,
): LearningTrackLibraryFormat | null {
  switch (kind) {
    case "multiple_choice":
      return "multiple_choice";
    case "letter_mixup":
      return "letter_mixup";
    case "flashcards":
      return "flashcards";
    case "listen_and_choose":
      return "listen_and_choose";
    case "explore_hotspots":
      return "explore_hotspots";
    case "language_in_focus":
      return null;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unsupported beat kind: ${_exhaustive}`);
    }
  }
}

/** True when LTC can pick a saved Activity Bank / library activity for this beat. */
export function beatSupportsLibrary(kind: LearningTrackBeatKind): boolean {
  // Explore hotspots resolves from studio_activities (Phase 3). Quiz library ports still pending.
  return kind === "explore_hotspots";
}

export function vocabCompileFormatForBeatKind(
  kind: LearningTrackBeatKind,
): LearningTrackVocabCompileFormat | null {
  return vocabFormatForKind(kind);
}

export function beatSupportsFixture(kind: LearningTrackBeatKind): boolean {
  return (
    kind === "explore_hotspots" ||
    kind === "language_in_focus" ||
    kind === "flashcards" ||
    kind === "listen_and_choose"
  );
}

function flashcardsSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackFlashcardsSettings {
  const defaults = defaultFlashcardsSettings();
  const saved = beat.presentation?.flashcards;
  if (!saved) return defaults;
  return {
    frontFaces: saved.frontFaces?.length ? saved.frontFaces : defaults.frontFaces,
    backFaces: saved.backFaces?.length ? saved.backFaces : defaults.backFaces,
    shuffleCards: saved.shuffleCards ?? defaults.shuffleCards,
  };
}

function multipleChoiceSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackMultipleChoiceSettings {
  const defaults = defaultMultipleChoiceSettings();
  const saved = beat.presentation?.multipleChoice;
  if (!saved) return defaults;
  return {
    masterQuestion: saved.masterQuestion?.trim() || defaults.masterQuestion,
    optionCount: saved.optionCount ?? defaults.optionCount,
    shuffleOptions: saved.shuffleOptions ?? defaults.shuffleOptions,
    autoAdvanceOnPass: saved.autoAdvanceOnPass ?? defaults.autoAdvanceOnPass,
    ...(typeof saved.promptAudioUrl === "string" && saved.promptAudioUrl.trim()
      ? { promptAudioUrl: saved.promptAudioUrl.trim() }
      : {}),
    ...(Array.isArray(saved.itemOverlays) && saved.itemOverlays.length > 0
      ? { itemOverlays: saved.itemOverlays }
      : {}),
  };
}

function letterMixupSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackLetterMixupSettings {
  const defaults = defaultLetterMixupSettings();
  const saved = beat.presentation?.letterMixup;
  if (!saved) return defaults;
  return {
    prompt: saved.prompt?.trim() || defaults.prompt,
    shuffleLetters: saved.shuffleLetters ?? defaults.shuffleLetters,
    caseSensitive: saved.caseSensitive ?? defaults.caseSensitive,
    autoAdvanceOnPass: saved.autoAdvanceOnPass ?? defaults.autoAdvanceOnPass,
    ...(typeof saved.imageAudioUrl === "string" && saved.imageAudioUrl.trim()
      ? { imageAudioUrl: saved.imageAudioUrl.trim() }
      : {}),
  };
}

function listenAndChooseSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackListenAndChooseSettings {
  const defaults = defaultListenAndChooseSettings();
  const saved = beat.presentation?.listenAndChoose;
  if (!saved) return defaults;
  return {
    ...(Array.isArray(saved.itemOverlays) && saved.itemOverlays.length > 0
      ? { itemOverlays: saved.itemOverlays }
      : {}),
  };
}

/** Apply Listen & Choose presentation overlays onto fixture/library screens. */
export function applyListenAndChooseBeatPresentation(
  beat: LearningTrackBeatInstance,
  screens: LearningTrackScreenPayload[],
): LearningTrackScreenPayload[] {
  if (beat.kind !== "listen_and_choose") return screens;
  return applyListenItemOverlays(screens, listenAndChooseSettingsForBeat(beat));
}

function exploreHotspotsSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackExploreHotspotsSettings {
  const defaults = defaultExploreHotspotsSettings();
  const saved = beat.presentation?.exploreHotspots;
  if (!saved) return defaults;
  return {
    ...(Array.isArray(saved.panelOverlays) && saved.panelOverlays.length > 0
      ? { panelOverlays: saved.panelOverlays }
      : {}),
    ...(Array.isArray(saved.turnOverlays) && saved.turnOverlays.length > 0
      ? { turnOverlays: saved.turnOverlays }
      : {}),
  };
}

/** Apply Explore Hotspots turn-audio overlays onto fixture/library screens. */
export function applyExploreHotspotsBeatPresentation(
  beat: LearningTrackBeatInstance,
  screens: LearningTrackScreenPayload[],
): LearningTrackScreenPayload[] {
  if (beat.kind !== "explore_hotspots") return screens;
  return applyHotspotTurnOverlays(screens, exploreHotspotsSettingsForBeat(beat));
}

function languageInFocusSettingsForBeat(
  beat: LearningTrackBeatInstance,
): LearningTrackLanguageInFocusSettings {
  const defaults = defaultLanguageInFocusSettings();
  const saved = beat.presentation?.languageInFocus;
  if (!saved) return defaults;
  return {
    ...(Array.isArray(saved.exampleOverlays) && saved.exampleOverlays.length > 0
      ? { exampleOverlays: saved.exampleOverlays }
      : {}),
  };
}

/** Apply Language in Focus listen-example audio overlays onto fixture screens. */
export function applyLanguageInFocusBeatPresentation(
  beat: LearningTrackBeatInstance,
  screens: LearningTrackScreenPayload[],
): LearningTrackScreenPayload[] {
  if (beat.kind !== "language_in_focus") return screens;
  return applyLifExampleOverlays(screens, languageInFocusSettingsForBeat(beat));
}

function applyFixtureBeatPresentation(
  beat: LearningTrackBeatInstance,
  screens: LearningTrackScreenPayload[],
): LearningTrackScreenPayload[] {
  return applyLanguageInFocusBeatPresentation(
    beat,
    applyExploreHotspotsBeatPresentation(
      beat,
      applyListenAndChooseBeatPresentation(beat, screens),
    ),
  );
}

/** Stamp (or clear) Lesson Player auto-advance on quiz screens. */
export function applyAutoAdvanceOnPass(
  screens: LearningTrackScreenPayload[],
  enabled: boolean,
): LearningTrackScreenPayload[] {
  return screens.map((screen) => ({
    ...screen,
    auto_advance_on_pass: enabled,
  }));
}

/** Fill missing MCQ prompt audio from a pack-wide clip URL. */
export function applyPackPromptAudio(
  screens: LearningTrackScreenPayload[],
  promptAudioUrl: string | undefined,
): LearningTrackScreenPayload[] {
  const url = promptAudioUrl?.trim();
  if (!url) return screens;
  return screens.map((screen) => {
    if (screen.subtype !== "mc_quiz") return screen;
    const existing =
      typeof screen.prompt_audio_url === "string" ? screen.prompt_audio_url.trim() : "";
    if (existing) return screen;
    return { ...screen, prompt_audio_url: url };
  });
}

/** Fill missing letter-scramble image audio from a pack-wide clip URL. */
export function applyPackLetterImageAudio(
  screens: LearningTrackScreenPayload[],
  imageAudioUrl: string | undefined,
): LearningTrackScreenPayload[] {
  const url = imageAudioUrl?.trim();
  if (!url) return screens;
  return screens.map((screen) => {
    if (screen.subtype !== "letter_mixup") return screen;
    const existing =
      typeof screen.image_audio_url === "string" ? screen.image_audio_url.trim() : "";
    if (existing) return screen;
    return {
      ...screen,
      image_audio_url: url,
      image_use_tts: false,
    };
  });
}

function exportVocabCompileScreens(
  list: VocabularyListDocument,
  format: LearningTrackVocabCompileFormat,
  label: string,
  beat?: LearningTrackBeatInstance,
): LearningTrackScreenPayload[] {
  const flashcards = beat
    ? flashcardsSettingsForBeat(beat)
    : defaultFlashcardsSettings();
  const multipleChoice = beat
    ? multipleChoiceSettingsForBeat(beat)
    : defaultMultipleChoiceSettings();
  const letterMixup = beat
    ? letterMixupSettingsForBeat(beat)
    : defaultLetterMixupSettings();

  const compiled = compileQuizzesFromVocabList({
    list,
    formats: [format],
    mcMasterQuestion: multipleChoice.masterQuestion,
    mcOptionCount: multipleChoice.optionCount,
    mcShuffleOptions: multipleChoice.shuffleOptions,
    mcStableItems: format === "multiple_choice",
    letterPrompt: letterMixup.prompt,
    letterShuffleLetters: letterMixup.shuffleLetters,
    letterCaseSensitive: letterMixup.caseSensitive,
    flashcardsFrontFaces: flashcards.frontFaces,
    flashcardsBackFaces: flashcards.backFaces,
    flashcardsShuffleCards: flashcards.shuffleCards,
  });
  const result = compiled.results[0];
  if (!result) throw new Error(`Could not compile ${format} from ${label}.`);

  if (format === "multiple_choice") {
    const authoring = applyMcItemOverlays(
      validateGamesAuthoringDocument(result.document),
      multipleChoice.itemOverlays,
    );
    const pack = exportGamesMcQuizForLessonPlayer(authoring);
    return applyAutoAdvanceOnPass(
      applyPackPromptAudio(
        screensFromGamesPack(pack, `${label} multiple choice`),
        multipleChoice.promptAudioUrl,
      ),
      multipleChoice.autoAdvanceOnPass,
    );
  }
  if (format === "letter_mixup") {
    const pack = exportGamesLetterMixupForLessonPlayer(
      validateGamesLetterMixupAuthoringDocument(result.document),
    );
    return applyAutoAdvanceOnPass(
      applyPackLetterImageAudio(
        screensFromGamesPack(pack, `${label} letter scramble`),
        letterMixup.imageAudioUrl,
      ),
      letterMixup.autoAdvanceOnPass,
    );
  }
  const pack = exportGamesFlashcardsForLessonPlayer(
    validateGamesFlashcardsAuthoringDocument(result.document),
  );
  return screensFromGamesPack(pack, `${label} flashcards`);
}

/** Sync path: built-in hobbies list only. */
export function compileQuizScreensFromBuiltinList(
  format: LearningTrackVocabCompileFormat,
  beat?: LearningTrackBeatInstance,
): LearningTrackScreenPayload[] {
  return exportVocabCompileScreens(
    createHobbiesVocabularyListDocument(),
    format,
    "hobbies vocabulary",
    beat,
  );
}

async function loadVocabularyList(listId: string): Promise<VocabularyListDocument> {
  if (listId === HOBBIES_DEFAULT_VOCAB_LIST_ID) {
    return createHobbiesVocabularyListDocument();
  }

  // Prefer Activity Bank (server) — survives browser clears.
  try {
    const response = await fetch(`/api/studio/activities/${encodeURIComponent(listId)}`, {
      method: "GET",
      credentials: "same-origin",
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        ok?: boolean;
        format?: string;
        authoring?: unknown;
        pack?: unknown;
      };
      if (payload.ok) {
        if (payload.format && payload.format !== "vocabulary_list") {
          throw new Error("That Activity Bank item is not a vocabulary list.");
        }
        return validateVocabularyListDocument(
          payload.authoring ??
            (payload.pack &&
            typeof payload.pack === "object" &&
            !Array.isArray(payload.pack) &&
            (payload.pack as { list?: unknown }).list
              ? (payload.pack as { list: unknown }).list
              : payload.pack),
        );
      }
    }
  } catch (error) {
    // Fall through to IndexedDB for unmigrated local ids.
    if (
      error instanceof Error &&
      /not a vocabulary list/i.test(error.message)
    ) {
      throw error;
    }
  }

  const entry = await getActivityLibraryEntry(listId);
  if (!entry) {
    throw new Error(
      `Vocabulary list "${listId}" was not found in Activity Bank or this browser’s local library. Import the .wkevocab.json file and Save to Activity Bank.`,
    );
  }
  return readVocabularyListFromLibraryEntry(entry);
}

async function compileQuizScreensFromList(
  listId: string,
  format: LearningTrackVocabCompileFormat,
  beat?: LearningTrackBeatInstance,
): Promise<LearningTrackScreenPayload[]> {
  let list = await loadVocabularyList(listId);
  try {
    list = await enrichVocabListMediaFromLexicon(list);
  } catch {
    // Non-fatal: compile with list media as authored if link enrich fails.
  }
  const label =
    listId === HOBBIES_DEFAULT_VOCAB_LIST_ID
      ? "hobbies vocabulary"
      : `vocabulary list “${list.name}”`;
  return exportVocabCompileScreens(list, format, label, beat);
}

async function loadExploreHotspotsScreensFromBank(
  activityId: string,
): Promise<LearningTrackScreenPayload[]> {
  const response = await fetch(
    `/api/studio/activities/${encodeURIComponent(activityId)}`,
    { method: "GET", credentials: "same-origin" },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    format?: string;
    pack?: unknown;
    authoring?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.error ||
        `Could not load hotspot activity (${response.status}). Save it from Activity Builder → Explore hotspots first.`,
    );
  }
  if (payload.format && payload.format !== "explore_hotspots") {
    throw new Error("That Activity Bank item is not an explore-hotspots activity.");
  }
  if (
    payload.pack &&
    typeof payload.pack === "object" &&
    !Array.isArray(payload.pack) &&
    (payload.pack as { subtype?: unknown }).subtype === "explore_hotspots"
  ) {
    return [asScreen(payload.pack, "Explore hotspots")];
  }
  if (payload.authoring) {
    return [
      asScreen(
        wkeActivityToExploreHotspotsPayload(payload.authoring),
        "Explore hotspots",
      ),
    ];
  }
  throw new Error("Explore hotspots activity is missing pack and authoring data.");
}

async function screensFromLibraryActivity(
  libraryId: string,
  format: LearningTrackLibraryFormat,
): Promise<LearningTrackScreenPayload[]> {
  if (format === "explore_hotspots") {
    return loadExploreHotspotsScreensFromBank(libraryId);
  }
  throw new Error(
    `Library beat source (${format}) is not wired in Lesson Player yet. Use a hobbies fixture or vocab-compile source for now.`,
  );
}

/** True when this beat can be resolved without IndexedDB. */
export function beatSourceIsSync(beat: LearningTrackBeatInstance): boolean {
  const { source } = beat;
  if (source.type === "fixture") return true;
  if (source.type === "vocab_compile") {
    return source.listId === HOBBIES_DEFAULT_VOCAB_LIST_ID;
  }
  return false;
}

/** Sync resolve — fixtures + built-in hobbies vocab only. */
export function resolveBeatScreensSync(
  beat: LearningTrackBeatInstance,
): LearningTrackScreenPayload[] {
  const { source } = beat;
  if (source.type === "fixture") {
    return applyFixtureBeatPresentation(beat, loadFixture(source.fixtureId));
  }
  if (source.type === "vocab_compile") {
    if (source.listId !== HOBBIES_DEFAULT_VOCAB_LIST_ID) {
      throw new Error(
        `Vocabulary list "${source.listId}" needs async compile (IndexedDB). Use compileLearningTrackAsync.`,
      );
    }
    return compileQuizScreensFromBuiltinList(source.format, beat);
  }
  if (source.type === "library") {
    throw new Error(
      `Library beat sources need async compile (libraryId=${source.libraryId}). Use compileLearningTrackAsync.`,
    );
  }
  const _exhaustive: never = source;
  throw new Error(`Unsupported beat source: ${JSON.stringify(_exhaustive)}`);
}

/** Async resolve — fixtures, any vocab list, and library activities. */
export async function resolveBeatScreens(
  beat: LearningTrackBeatInstance,
): Promise<LearningTrackScreenPayload[]> {
  const { source } = beat;
  if (source.type === "fixture") {
    return applyFixtureBeatPresentation(beat, loadFixture(source.fixtureId));
  }
  if (source.type === "vocab_compile") {
    const expected = vocabCompileFormatForBeatKind(beat.kind);
    if (expected && source.format !== expected) {
      throw new Error(
        `Beat “${beat.label ?? beat.kind}” expects vocab format ${expected}, got ${source.format}.`,
      );
    }
    return compileQuizScreensFromList(source.listId, source.format, beat);
  }
  if (source.type === "library") {
    const expected = libraryFormatForBeatKind(beat.kind);
    if (!expected || !beatSupportsLibrary(beat.kind)) {
      throw new Error(
        `${beat.kind} cannot use a library activity yet — keep the hobbies fixture for now.`,
      );
    }
    if (source.format !== expected) {
      throw new Error(
        `Beat “${beat.label ?? beat.kind}” expects library format ${expected}, got ${source.format}.`,
      );
    }
    const screens = await screensFromLibraryActivity(source.libraryId, source.format);
    return applyFixtureBeatPresentation(beat, screens);
  }
  const _exhaustive: never = source;
  throw new Error(`Unsupported beat source: ${JSON.stringify(_exhaustive)}`);
}

import {
  compositionFromRecipe,
  resolveAfterBridgePlan,
} from "@/lib/learning-tracks/composition";
import {
  getLearningTrackComposition,
  HOBBIES_DAY_1_COMPOSITION,
  listLearningTrackCompositions,
} from "@/lib/learning-tracks/compositions/hobbies-day-1";
import { HOBBIES_DAY_1_RECIPE } from "@/lib/learning-tracks/recipes/hobbies-day-1";
import {
  beatSourceIsSync,
  resolveBeatScreens,
  resolveBeatScreensSync,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type {
  CompileLearningTrackResult,
  LearningTrackBeatInstance,
  LearningTrackBeatKind,
  LearningTrackBeatPlan,
  LearningTrackComposition,
  LearningTrackLessonPlayerPack,
  LearningTrackRecipe,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";
import { LEARNING_TRACK_BEAT_LABELS } from "@/lib/learning-tracks/composition-types";

function estimatedMinutesForKind(kind: LearningTrackBeatKind): number {
  if (kind === "presentation") return 2;
  if (kind === "explore_hotspots" || kind === "language_in_focus") return 2.5;
  if (kind === "flashcards") return 2;
  if (kind === "listen_and_choose") return 2.5;
  if (kind === "listening_item_match") return 3;
  if (kind === "multiple_choice") return 2;
  return 1.5;
}

function buildPostQuizReportScreen(input: {
  beat: LearningTrackBeatInstance;
  beatLabel: string;
  screenStart: number;
  screenEnd: number;
  nextBeat: LearningTrackBeatInstance;
  nextBeatLabel: string;
}): LearningTrackScreenPayload {
  return {
    type: "interaction",
    subtype: "post_quiz_report",
    source_beat_id: input.beat.id,
    source_beat_label: input.beatLabel,
    source_screen_start: input.screenStart,
    source_screen_end: input.screenEnd,
    title: "Nice work!",
    encouragement: "You completed this activity. Keep going!",
    next_beat_id: input.nextBeat.id,
    next_activity_label: input.nextBeatLabel,
    next_activity_cue: `Next up: ${input.nextBeatLabel}`,
  };
}

function normalizeComposition(
  input?: LearningTrackComposition | LearningTrackRecipe,
): LearningTrackComposition {
  if (!input) return structuredClone(HOBBIES_DAY_1_COMPOSITION);
  if ((input as LearningTrackComposition).kind === "learning-track-composition") {
    return structuredClone(input as LearningTrackComposition);
  }
  return compositionFromRecipe(input as LearningTrackRecipe);
}

function appendBeatPlan(input: {
  beat: LearningTrackBeatInstance;
  beatScreens: LearningTrackScreenPayload[];
  screens: LearningTrackScreenPayload[];
  nextBeat: LearningTrackBeatInstance | undefined;
  beatPlan: LearningTrackBeatPlan[];
}) {
  const { beat, beatScreens, screens, nextBeat, beatPlan } = input;
  const screenStart = screens.length;
  screens.push(...beatScreens);
  const screenEnd = screens.length;
  const plannedBridge = resolveAfterBridgePlan(beat, nextBeat);
  const beatLabel = beat.label ?? LEARNING_TRACK_BEAT_LABELS[beat.kind];
  let afterBridge = plannedBridge;

  if (plannedBridge && nextBeat) {
    const nextBeatLabel = nextBeat.label ?? LEARNING_TRACK_BEAT_LABELS[nextBeat.kind];
    const screenIndex = screens.length;
    screens.push(
      buildPostQuizReportScreen({
        beat,
        beatLabel,
        screenStart,
        screenEnd,
        nextBeat,
        nextBeatLabel,
      }),
    );
    afterBridge = {
      ...plannedBridge,
      status: "emitted",
      screenIndex,
    };
  }

  beatPlan.push({
    id: beat.id,
    kind: beat.kind,
    label: beatLabel,
    estimatedMinutes: estimatedMinutesForKind(beat.kind),
    screenCount: beatScreens.length,
    screenStart,
    screenEnd,
    ...(afterBridge ? { afterBridge } : {}),
  });
}

function buildResult(
  composition: LearningTrackComposition,
  screens: LearningTrackScreenPayload[],
  beatPlan: LearningTrackBeatPlan[],
): CompileLearningTrackResult {
  const estimatedMinutes = Math.round(
    beatPlan.reduce((sum, beat) => sum + beat.estimatedMinutes, 0),
  );

  const pack: LearningTrackLessonPlayerPack = {
    version: 1,
    kind: "lessonplayer-track-pack",
    id: composition.id,
    pack_id: composition.packId,
    pack_title: composition.packTitle,
    track_index: composition.trackIndex,
    title: composition.title,
    aim: composition.aim,
    duration_target_min: composition.durationTargetMin,
    estimated_minutes: estimatedMinutes,
    ...(composition.cefr ? { cefr: composition.cefr } : {}),
    beat_plan: beatPlan,
    screens,
  };

  return { pack, beatPlan, composition };
}

/**
 * Sync compile — fixtures + built-in hobbies vocab only.
 * Prefer `compileLearningTrackAsync` when beats use library activities or saved vocab lists.
 */
export function compileLearningTrack(
  input?: LearningTrackComposition | LearningTrackRecipe,
): CompileLearningTrackResult {
  const composition = normalizeComposition(input);
  if (composition.beats.length < 1) {
    throw new Error("Track needs at least one beat.");
  }
  for (const beat of composition.beats) {
    if (!beatSourceIsSync(beat)) {
      throw new Error(
        `Beat “${beat.label ?? beat.kind}” uses a library source. Use compileLearningTrackAsync.`,
      );
    }
  }

  const screens: LearningTrackScreenPayload[] = [];
  const beatPlan: LearningTrackBeatPlan[] = [];

  for (const [index, beat] of composition.beats.entries()) {
    appendBeatPlan({
      beat,
      beatScreens: resolveBeatScreensSync(beat),
      screens,
      nextBeat: composition.beats[index + 1],
      beatPlan,
    });
  }

  return buildResult(composition, screens, beatPlan);
}

/** Full compile — fixtures, Activity Library activities, and any vocabulary list. */
export async function compileLearningTrackAsync(
  input?: LearningTrackComposition | LearningTrackRecipe,
): Promise<CompileLearningTrackResult> {
  const composition = normalizeComposition(input);
  if (composition.beats.length < 1) {
    throw new Error("Track needs at least one beat.");
  }

  const screens: LearningTrackScreenPayload[] = [];
  const beatPlan: LearningTrackBeatPlan[] = [];

  for (const [index, beat] of composition.beats.entries()) {
    const beatScreens = await resolveBeatScreens(beat);
    appendBeatPlan({
      beat,
      beatScreens,
      screens,
      nextBeat: composition.beats[index + 1],
      beatPlan,
    });
  }

  return buildResult(composition, screens, beatPlan);
}

export function listLearningTrackRecipes(): LearningTrackRecipe[] {
  return [HOBBIES_DAY_1_RECIPE];
}

export function getLearningTrackRecipe(id: string): LearningTrackRecipe | undefined {
  return listLearningTrackRecipes().find((recipe) => recipe.id === id);
}

export {
  getLearningTrackComposition,
  listLearningTrackCompositions,
  HOBBIES_DAY_1_COMPOSITION,
};

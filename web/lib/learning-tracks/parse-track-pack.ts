import { parseScreenPayload, type ScreenPayload } from "@/lib/lesson-schemas";

export type LearningTrackBeatPlan = {
  id: string;
  kind: string;
  label: string;
  estimatedMinutes: number;
  screenCount: number;
  screenStart?: number;
  screenEnd?: number;
  afterBridge?: {
    kind: "post_quiz_report";
    status: "planned" | "emitted";
    nextBeatId?: string;
    nextBeatLabel?: string;
    screenIndex?: number;
    intent: string;
  };
};

export type LearningTrackLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-track-pack";
  id: string;
  pack_id: string;
  pack_title: string;
  track_index: number;
  title: string;
  aim: string;
  duration_target_min: number;
  estimated_minutes: number;
  cefr?: string;
  beat_plan: LearningTrackBeatPlan[];
  screens: ScreenPayload[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

/** Parse a Studio learning-track export into typed LP screens. */
export function parseLearningTrackLessonPlayerPack(
  raw: unknown,
): LearningTrackLessonPlayerPack {
  if (!isRecord(raw)) throw new Error("Learning track pack must be an object.");
  if (raw.version !== 1) throw new Error("Learning track pack must be version 1.");
  if (raw.kind !== "lessonplayer-track-pack") {
    throw new Error('Expected kind "lessonplayer-track-pack".');
  }

  const id = assertString(raw.id, "id");
  const packId = assertString(raw.pack_id, "pack_id");
  const packTitle = assertString(raw.pack_title, "pack_title");
  const title = assertString(raw.title, "title");
  const aim = assertString(raw.aim, "aim");

  if (typeof raw.track_index !== "number" || !Number.isFinite(raw.track_index)) {
    throw new Error("track_index must be a number.");
  }
  if (
    typeof raw.duration_target_min !== "number" ||
    !Number.isFinite(raw.duration_target_min)
  ) {
    throw new Error("duration_target_min must be a number.");
  }
  if (
    typeof raw.estimated_minutes !== "number" ||
    !Number.isFinite(raw.estimated_minutes)
  ) {
    throw new Error("estimated_minutes must be a number.");
  }
  if (!Array.isArray(raw.screens) || raw.screens.length < 1) {
    throw new Error("Track needs at least one screen.");
  }
  if (!Array.isArray(raw.beat_plan)) {
    throw new Error("beat_plan must be an array.");
  }

  const screens = raw.screens.map((screen, index) => {
    const parsed = parseScreenPayload("interaction", screen);
    if (!parsed) {
      throw new Error(`Screen ${index + 1} is not a valid interaction payload.`);
    }
    return parsed;
  });

  const beat_plan: LearningTrackBeatPlan[] = raw.beat_plan.map((beat, index) => {
    if (!isRecord(beat)) throw new Error(`beat_plan[${index}] must be an object.`);
    const screenStart =
      typeof beat.screenStart === "number"
        ? beat.screenStart
        : typeof beat.screen_start === "number"
          ? beat.screen_start
          : 0;
    const screenEnd =
      typeof beat.screenEnd === "number"
        ? beat.screenEnd
        : typeof beat.screen_end === "number"
          ? beat.screen_end
          : screenStart + (typeof beat.screenCount === "number" ? beat.screenCount : 0);

    const afterRaw = beat.afterBridge ?? beat.after_bridge;
    let afterBridge: LearningTrackBeatPlan["afterBridge"];
    if (isRecord(afterRaw) && afterRaw.kind === "post_quiz_report") {
      afterBridge = {
        kind: "post_quiz_report",
        status: afterRaw.status === "emitted" ? "emitted" : "planned",
        ...(typeof afterRaw.nextBeatId === "string"
          ? { nextBeatId: afterRaw.nextBeatId }
          : typeof afterRaw.next_beat_id === "string"
            ? { nextBeatId: afterRaw.next_beat_id }
            : {}),
        ...(typeof afterRaw.nextBeatLabel === "string"
          ? { nextBeatLabel: afterRaw.nextBeatLabel }
          : typeof afterRaw.next_beat_label === "string"
            ? { nextBeatLabel: afterRaw.next_beat_label }
            : {}),
        ...(typeof afterRaw.screenIndex === "number"
          ? { screenIndex: afterRaw.screenIndex }
          : typeof afterRaw.screen_index === "number"
            ? { screenIndex: afterRaw.screen_index }
            : {}),
        intent:
          typeof afterRaw.intent === "string"
            ? afterRaw.intent
            : "Show a brief quiz report with encouragement, then cue the next activity.",
      };
    }

    return {
      id: assertString(beat.id, `beat_plan[${index}].id`),
      kind: assertString(beat.kind, `beat_plan[${index}].kind`),
      label: assertString(beat.label, `beat_plan[${index}].label`),
      estimatedMinutes:
        typeof beat.estimatedMinutes === "number" ? beat.estimatedMinutes : 0,
      screenCount: typeof beat.screenCount === "number" ? beat.screenCount : 0,
      screenStart,
      screenEnd,
      ...(afterBridge ? { afterBridge } : {}),
    };
  });

  return {
    version: 1,
    kind: "lessonplayer-track-pack",
    id,
    pack_id: packId,
    pack_title: packTitle,
    track_index: raw.track_index,
    title,
    aim,
    duration_target_min: raw.duration_target_min,
    estimated_minutes: raw.estimated_minutes,
    ...(typeof raw.cefr === "string" && raw.cefr.trim()
      ? { cefr: raw.cefr.trim() }
      : {}),
    beat_plan,
    screens,
  };
}

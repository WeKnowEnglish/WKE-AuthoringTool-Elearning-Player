import type { DraftScreenRow } from "@/lib/ai/gemini";
import {
  storyFirstBlueprintSchema,
  type StoryFirstBlueprint,
} from "@/lib/ai/ai-lesson-plan";
import type { LearningLoopConfig, LearningLoopPhase } from "@/lib/learning-loop";
import { parseScreenPayload } from "@/lib/lesson-schemas-player";
import type { LessonScreenRow } from "@/lib/data/catalog";
import lessonPlanJson from "@/content/golden-references/daily-bakery-quest/lesson_plan.json";
import screensJson from "@/content/golden-references/daily-bakery-quest/screens.json";

export const DAILY_BAKERY_QUEST_ID = "daily-bakery-quest";

export type DailyBakeryPhaseContentMap = {
  STORY: { screenIndices: number[] };
  PRESENTATION: { screenIndices: number[] };
  EXPLORER: { exploreSceneId: "bakery_recipe_rescue" };
  REFLECTION: { screenIndices: number[] };
};

export type DailyBakeryLessonPlanBundle = {
  storyFirstBlueprint: StoryFirstBlueprint;
  screenOutline: NonNullable<typeof lessonPlanJson.screenOutline>;
  mediaSearchTerms: string[];
  learningLoop: LearningLoopConfig;
  phaseContentMap: DailyBakeryPhaseContentMap;
};

export type DailyBakeryScreensBundle = {
  screens: DraftScreenRow[];
};

const lessonPlan = lessonPlanJson as {
  storyFirstBlueprint: unknown;
  screenOutline: DailyBakeryLessonPlanBundle["screenOutline"];
  mediaSearchTerms: string[];
  learningLoop: LearningLoopConfig;
  phaseContentMap: DailyBakeryPhaseContentMap;
};

const screensBundle = screensJson as DailyBakeryScreensBundle;

export function getDailyBakeryLessonPlan(): DailyBakeryLessonPlanBundle {
  const parsed = storyFirstBlueprintSchema.parse(lessonPlan.storyFirstBlueprint);
  return {
    storyFirstBlueprint: parsed,
    screenOutline: lessonPlan.screenOutline,
    mediaSearchTerms: lessonPlan.mediaSearchTerms,
    learningLoop: lessonPlan.learningLoop,
    phaseContentMap: lessonPlan.phaseContentMap,
  };
}

export function getDailyBakeryScreens(): DraftScreenRow[] {
  return screensBundle.screens;
}

export function dailyBakeryScreensForPhase(
  phase: LearningLoopPhase,
): DraftScreenRow[] {
  if (phase === "COMPLETE" || phase === "EXPLORER") return [];
  const map = getDailyBakeryLessonPlan().phaseContentMap;
  const indices =
    phase === "STORY" ? map.STORY.screenIndices
    : phase === "PRESENTATION" ? map.PRESENTATION.screenIndices
    : phase === "REFLECTION" ? map.REFLECTION.screenIndices
    : [];
  const all = getDailyBakeryScreens();
  return indices
    .map((i) => all[i])
    .filter((row): row is DraftScreenRow => row != null);
}

export function dailyBakeryScreensToLessonRows(
  screens: DraftScreenRow[],
  lessonId = DAILY_BAKERY_QUEST_ID,
): LessonScreenRow[] {
  return screens.map((row, order_index) => ({
    id: `${lessonId}-screen-${order_index}`,
    lesson_id: lessonId,
    order_index,
    screen_type: row.screen_type,
    payload: row.payload,
  }));
}

export type ScreenValidationIssue = {
  index: number;
  screen_type: string;
  message: string;
};

export function validateDailyBakeryScreens(
  screens: DraftScreenRow[] = getDailyBakeryScreens(),
): ScreenValidationIssue[] {
  const issues: ScreenValidationIssue[] = [];
  screens.forEach((row, index) => {
    const parsed = parseScreenPayload(row.screen_type, row.payload);
    if (!parsed) {
      issues.push({
        index,
        screen_type: row.screen_type,
        message: `Screen ${index} (${row.screen_type}) failed parseScreenPayload`,
      });
    }
  });
  return issues;
}

export function assertDailyBakeryGoldenReferenceValid(): void {
  getDailyBakeryLessonPlan();
  const issues = validateDailyBakeryScreens();
  if (issues.length > 0) {
    const detail = issues.map((i) => `#${i.index} ${i.screen_type}: ${i.message}`).join("; ");
    throw new Error(`Daily Bakery Quest golden reference invalid: ${detail}`);
  }
}

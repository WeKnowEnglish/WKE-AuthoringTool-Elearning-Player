import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesLetterMixupLessonPlayerPack } from "@/lib/games-letter-mixup/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { exploreHotspotsPayloadSchema } from "@/lib/lesson-schemas";
import type { LessonScreenRow } from "@/lib/lesson/types";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type SpacePlayPackView = {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
};

/** Parse a frozen Space pack into LessonPlayer screens (same as pilots). */
export function spacePackToLessonScreens(
  format: StudioActivityFormat,
  pack: unknown,
  itemId: string,
): SpacePlayPackView {
  if (format === "multiple_choice") {
    const parsed = parseGamesMcQuizLessonPlayerPack(pack);
    return {
      lessonId: `space-mc-${itemId}`,
      lessonTitle: parsed.activity_name || parsed.quiz_group_title,
      screens: parsed.screens.map((payload, index) => ({
        id: `space-mc-${itemId}-${index}`,
        lesson_id: `space-mc-${itemId}`,
        order_index: index,
        screen_type: "interaction" as const,
        payload,
      })),
    };
  }
  if (format === "letter_mixup") {
    const parsed = parseGamesLetterMixupLessonPlayerPack(pack);
    return {
      lessonId: `space-letter-${itemId}`,
      lessonTitle: parsed.activity_name || parsed.quiz_group_title,
      screens: parsed.screens.map((payload, index) => ({
        id: `space-letter-${itemId}-${index}`,
        lesson_id: `space-letter-${itemId}`,
        order_index: index,
        screen_type: "interaction" as const,
        payload,
      })),
    };
  }
  if (format === "flashcards") {
    const parsed = parseGamesFlashcardsLessonPlayerPack(pack);
    return {
      lessonId: `space-flash-${itemId}`,
      lessonTitle: parsed.activity_name || parsed.quiz_group_title,
      screens: parsed.screens.map((payload, index) => ({
        id: `space-flash-${itemId}-${index}`,
        lesson_id: `space-flash-${itemId}`,
        order_index: index,
        screen_type: "interaction" as const,
        payload,
      })),
    };
  }
  if (format === "explore_hotspots") {
    const payload = exploreHotspotsPayloadSchema.parse(pack);
    const lessonId = `space-hotspots-${itemId}`;
    return {
      lessonId,
      lessonTitle: payload.activity_name || "Explore hotspots",
      screens: [
        {
          id: `${lessonId}-0`,
          lesson_id: lessonId,
          order_index: 0,
          screen_type: "interaction" as const,
          payload,
        },
      ],
    };
  }
  if (format === "vocabulary_list") {
    throw new Error("Vocabulary lists are authoring sources, not playable Space packs.");
  }
  const parsed = parseLearningTrackLessonPlayerPack(pack);
  return {
    lessonId: `space-track-${itemId}`,
    lessonTitle: parsed.title || parsed.pack_title,
    screens: parsed.screens.map((payload, index) => ({
      id: `space-track-${itemId}-${index}`,
      lesson_id: `space-track-${itemId}`,
      order_index: index,
      screen_type: "interaction" as const,
      payload,
    })),
  };
}

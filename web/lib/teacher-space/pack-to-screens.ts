import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesLetterMixupLessonPlayerPack } from "@/lib/games-letter-mixup/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { parseGamesListenAndChooseLessonPlayerPack } from "@/lib/games-listen-choose/parse-games-pack";
import { parseGamesLineMatchLessonPlayerPack } from "@/lib/games-line-match/parse-games-pack";
import { parseGamesTrueFalseLessonPlayerPack } from "@/lib/games-true-false/parse-games-pack";
import { parseGamesSentenceScrambleLessonPlayerPack } from "@/lib/games-sentence-scramble/parse-games-pack";
import { parseGamesFillBlanksLessonPlayerPack } from "@/lib/games-fill-blanks/parse-games-pack";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { exploreHotspotsPayloadSchema } from "@/lib/lesson-schemas";
import type { LessonScreenRow } from "@/lib/lesson/types";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type SpacePlayPackView = {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
};

type GamesPackLike = {
  activity_name: string;
  quiz_group_title?: string;
  screens: unknown[];
};

function gamesPackView(
  prefix: string,
  itemId: string,
  parsed: GamesPackLike,
): SpacePlayPackView {
  const lessonId = `space-${prefix}-${itemId}`;
  return {
    lessonId,
    lessonTitle: parsed.activity_name || parsed.quiz_group_title || "Quiz",
    screens: parsed.screens.map((payload, index) => ({
      id: `${lessonId}-${index}`,
      lesson_id: lessonId,
      order_index: index,
      screen_type: "interaction" as const,
      payload: payload as LessonScreenRow["payload"],
    })),
  };
}

/** Parse a frozen Space / homework pack into LessonPlayer screens (same as pilots). */
export function spacePackToLessonScreens(
  format: StudioActivityFormat,
  pack: unknown,
  itemId: string,
): SpacePlayPackView {
  if (format === "multiple_choice") {
    return gamesPackView("mc", itemId, parseGamesMcQuizLessonPlayerPack(pack));
  }
  if (format === "letter_mixup") {
    return gamesPackView("letter", itemId, parseGamesLetterMixupLessonPlayerPack(pack));
  }
  if (format === "flashcards") {
    return gamesPackView("flash", itemId, parseGamesFlashcardsLessonPlayerPack(pack));
  }
  if (format === "listen_and_choose") {
    return gamesPackView(
      "listen",
      itemId,
      parseGamesListenAndChooseLessonPlayerPack(pack),
    );
  }
  if (format === "line_match") {
    return gamesPackView("line-match", itemId, parseGamesLineMatchLessonPlayerPack(pack));
  }
  if (format === "true_false") {
    return gamesPackView("tf", itemId, parseGamesTrueFalseLessonPlayerPack(pack));
  }
  if (format === "sentence_scramble") {
    return gamesPackView(
      "scramble",
      itemId,
      parseGamesSentenceScrambleLessonPlayerPack(pack),
    );
  }
  if (format === "fill_blanks") {
    return gamesPackView("fill", itemId, parseGamesFillBlanksLessonPlayerPack(pack));
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

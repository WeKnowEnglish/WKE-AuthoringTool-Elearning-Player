import type { LearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import type { LessonScreenRow } from "@/lib/lesson/types";

export type PracticeTrackPlayerView = {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
};

export function learningTrackPackToPlayerView(
  pack: LearningTrackLessonPlayerPack,
  lessonId: string,
): PracticeTrackPlayerView {
  return {
    lessonId,
    lessonTitle: pack.title || pack.pack_title,
    screens: pack.screens.map((payload, index) => ({
      id: `${lessonId}-${index}`,
      lesson_id: lessonId,
      order_index: index,
      screen_type: "interaction",
      payload,
    })),
  };
}

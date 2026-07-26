import hobbiesHotspotsActivity from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import hobbiesLikeIng from "@/content/pilots/language-in-focus/hobbies-like-ing.json";
import hobbiesFlashcards from "@/content/pilots/games-flashcards/hobbies-flashcards.json";
import hobbiesListenChoose from "@/content/pilots/games-listen-choose/hobbies-listen-choose.json";
import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesListenAndChooseLessonPlayerPack } from "@/lib/games-listen-choose/parse-games-pack";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import { parseScreenPayload } from "@/lib/lesson-schemas";
import type { LearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";

/**
 * Builtin hobbies Day-1 track assembled from existing LP fixtures.
 * Studio compile adds MCQ + letter scramble; this builtin covers the core spine
 * so the pilot works even without a Studio inbox handoff.
 */
export function buildHobbiesDay1BuiltinTrackPack(): LearningTrackLessonPlayerPack {
  const hotspot = wkeActivityToExploreHotspotsPayload(hobbiesHotspotsActivity);
  const lif = parseScreenPayload("interaction", hobbiesLikeIng);
  if (!lif) throw new Error("Hobbies Language in Focus fixture failed to parse.");
  const flashcards = parseGamesFlashcardsLessonPlayerPack(hobbiesFlashcards).screens;
  const listen = parseGamesListenAndChooseLessonPlayerPack(hobbiesListenChoose).screens;

  const screens = [hotspot, ...flashcards, lif, ...listen];
  let cursor = 0;
  const beat = (
    id: string,
    kind: string,
    label: string,
    estimatedMinutes: number,
    screenCount: number,
    afterBridge?: LearningTrackLessonPlayerPack["beat_plan"][number]["afterBridge"],
  ) => {
    const screenStart = cursor;
    cursor += screenCount;
    return {
      id,
      kind,
      label,
      estimatedMinutes,
      screenCount,
      screenStart,
      screenEnd: cursor,
      ...(afterBridge ? { afterBridge } : {}),
    };
  };

  return {
    version: 1,
    kind: "lessonplayer-track-pack",
    id: "hobbies-day-1",
    pack_id: "our-favorite-hobbies",
    pack_title: "Our favorite hobbies",
    track_index: 1,
    title: "Our favorite hobbies · Day 1",
    aim: "Meet hobby words, notice I like + -ing, then practice with listening.",
    duration_target_min: 12,
    estimated_minutes: 10,
    cefr: "A1",
    beat_plan: [
      beat("hotspots", "explore_hotspots", "Explore hotspots", 2.5, 1),
      beat("flashcards", "flashcards", "Flashcards", 2, flashcards.length),
      beat("lif", "language_in_focus", "Language in Focus", 2.5, 1),
      beat("listen", "listen_and_choose", "Listen and choose", 2.5, listen.length),
    ],
    screens,
  };
}

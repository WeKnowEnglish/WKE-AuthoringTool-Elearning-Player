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
      {
        id: "hotspots",
        kind: "explore_hotspots",
        label: "Explore hotspots",
        estimatedMinutes: 2.5,
        screenCount: 1,
      },
      {
        id: "flashcards",
        kind: "flashcards",
        label: "Flashcards",
        estimatedMinutes: 2,
        screenCount: flashcards.length,
      },
      {
        id: "lif",
        kind: "language_in_focus",
        label: "Language in Focus",
        estimatedMinutes: 2.5,
        screenCount: 1,
      },
      {
        id: "listen",
        kind: "listen_and_choose",
        label: "Listen and choose",
        estimatedMinutes: 2.5,
        screenCount: listen.length,
      },
    ],
    screens,
  };
}

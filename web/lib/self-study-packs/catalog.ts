import { topicMenuImageSrc } from "@/lib/teststartpage/bank";
import type { SelfStudyPackSummary } from "@/lib/self-study-packs/types";

/**
 * Planned Self Study packs (8-lesson format).
 * Content screens are empty for now — catalog drives the pilot list shell.
 */
export const SELF_STUDY_PACK_CATALOG: SelfStudyPackSummary[] = [
  {
    id: "breakfast-bakery",
    title: "Breakfast Bakery",
    subtitle: "Bread, milk, eggs, jam — help at the bakery",
    coverImageUrl: topicMenuImageSrc("food"),
    levelLabel: "A1",
    status: "draft",
    lessonCount: 8,
    buildNote: "First pack to flesh out (vocab + practice strongest).",
  },
  {
    id: "school-day",
    title: "School Day",
    subtitle: "Classroom words and daily school routines",
    coverImageUrl: topicMenuImageSrc("school"),
    levelLabel: "A1",
    status: "planned",
    lessonCount: 8,
    buildNote: "After breakfast pack shape is locked.",
  },
  {
    id: "animal-friends",
    title: "Animal Friends",
    subtitle: "Pets and animals — names, actions, likes",
    coverImageUrl: topicMenuImageSrc("animals"),
    levelLabel: "A1",
    status: "planned",
    lessonCount: 8,
    buildNote: "Reuse animal vocab media.",
  },
  {
    id: "weather-wear",
    title: "Weather & Wear",
    subtitle: "Weather words and clothes for the day",
    coverImageUrl: topicMenuImageSrc("weather"),
    levelLabel: "A1",
    status: "planned",
    lessonCount: 8,
    buildNote: "Combines weather + clothes topics.",
  },
  {
    id: "my-clothes",
    title: "My Clothes",
    subtitle: "What I wear — colors, clothes, seasons",
    coverImageUrl: topicMenuImageSrc("clothes"),
    levelLabel: "A1",
    status: "planned",
    lessonCount: 8,
    buildNote: "Clothes-focused pack.",
  },
  {
    id: "actions-day",
    title: "Busy Day Actions",
    subtitle: "Everyday verbs — I can / I like to",
    coverImageUrl: topicMenuImageSrc("actions"),
    levelLabel: "A1",
    status: "planned",
    lessonCount: 8,
    buildNote: "Action verbs; speaking slots matter here.",
  },
];

export function listSelfStudyPacks(): SelfStudyPackSummary[] {
  return SELF_STUDY_PACK_CATALOG;
}

export function getSelfStudyPack(id: string): SelfStudyPackSummary | undefined {
  return SELF_STUDY_PACK_CATALOG.find((pack) => pack.id === id);
}

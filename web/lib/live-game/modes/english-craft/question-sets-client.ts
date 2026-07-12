export type LiveGameQuestionSetId = "daily-routines-a1" | "school-life-a1" | "describing-places-a1";

export type LiveGameQuestionSetSummary = {
  id: LiveGameQuestionSetId;
  version: number;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  questionCount: number;
};

export const DEFAULT_LIVE_GAME_QUESTION_SET_ID: LiveGameQuestionSetId = "daily-routines-a1";

export const LIVE_GAME_QUESTION_SET_SUMMARIES: LiveGameQuestionSetSummary[] = [
  {
    id: "daily-routines-a1", version: 1, title: "Daily Routines", level: "A1",
    topic: "Routines", learningObjective: "Describe everyday routines using present-simple verbs and frequency words.",
    description: "Wake up, get dressed, have breakfast, go to school, homework, usually and never.", questionCount: 7,
  },
  {
    id: "school-life-a1", version: 1, title: "School Life", level: "A1",
    topic: "School", learningObjective: "Understand and use common words for school places and activities.",
    description: "Classroom, library, subjects, break time, homework, borrow and study.", questionCount: 7,
  },
  {
    id: "describing-places-a1", version: 1, title: "Describing Places", level: "A1",
    topic: "Places", learningObjective: "Describe where things are using there is/there are and prepositions.",
    description: "There is, there are, next to, behind, between and in front of.", questionCount: 7,
  },
];

export function isLiveGameQuestionSetId(value: unknown): value is LiveGameQuestionSetId {
  return LIVE_GAME_QUESTION_SET_SUMMARIES.some((set) => set.id === value);
}

export function getLiveGameQuestionSetSummary(id: LiveGameQuestionSetId) {
  return LIVE_GAME_QUESTION_SET_SUMMARIES.find((set) => set.id === id)!;
}

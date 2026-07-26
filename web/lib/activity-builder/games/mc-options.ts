import type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";

const OPTION_IDS = ["a", "b", "c", "d", "e", "f"] as const;

export function makeMcOptions(labels: string[]): GamesMcItem["options"] {
  return labels.map((label, index) => ({
    id: OPTION_IDS[index] ?? `o${index + 1}`,
    label,
  }));
}

export function createBlankGamesMcQuizDocument(): GamesAuthoringDocument {
  const options = makeMcOptions(["Answer A", "Answer B", "Answer C", "Answer D"]);
  return {
    version: 1,
    kind: "activity-authoring",
    id: "games-mc-blank",
    name: "New multiple-choice quiz",
    educationalIntent: {
      objective: "Check understanding with multiple-choice questions.",
      successCriteria: "Students choose the correct answer for each question.",
    },
    content: {
      instruction: "Choose the best answer.",
      completionMessage: "Nice work!",
    },
    interaction: {
      type: "games",
      format: "multiple_choice",
      quizGroupId: "games-mc-blank",
      quizGroupTitle: "Quick check",
      shuffleOptionsDefault: true,
      items: [
        {
          id: "q1",
          question: "Question?",
          options,
          correctOptionId: "a",
        },
      ],
    },
  };
}

/** Bakery vocabulary starter used in Studio + Lesson Player pilot. */
export function createBakeryGamesMcQuizDocument(): GamesAuthoringDocument {
  return {
    version: 1,
    kind: "activity-authoring",
    id: "bakery-quick-check",
    name: "Bakery quick check",
    educationalIntent: {
      objective: "Review bakery vocabulary with short multiple-choice questions.",
      successCriteria: "Students pick the correct word or meaning for each item.",
      cefr: "A1",
      vocabulary: ["bakery", "bread", "cake", "cookie"],
    },
    content: {
      instruction: "Choose the best answer for each question.",
      completionMessage: "Great job at the bakery!",
    },
    interaction: {
      type: "games",
      format: "multiple_choice",
      quizGroupId: "bakery-quick-check",
      quizGroupTitle: "Bakery quick check",
      shuffleOptionsDefault: true,
      items: [
        {
          id: "q-bakery",
          question: "Which place sells bread and cakes?",
          options: makeMcOptions(["bakery", "library", "park", "school"]),
          correctOptionId: "a",
        },
        {
          id: "q-bread",
          question: "What do you buy to make a sandwich?",
          options: makeMcOptions(["cookie", "bread", "juice", "soap"]),
          correctOptionId: "b",
        },
        {
          id: "q-cake",
          question: "Which word matches this meaning?\nA sweet food for birthdays.",
          options: makeMcOptions(["cake", "soup", "rice", "salt"]),
          correctOptionId: "a",
        },
      ],
    },
  };
}

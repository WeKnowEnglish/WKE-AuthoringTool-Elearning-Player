import type {
  EnglishCraftCraftQuestion,
  EnglishCraftMcQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";

export type SystemQuestionSetSlug =
  | "grade56-adjectives"
  | "daily-routines-a1"
  | "school-life-a1"
  | "describing-places-a1";

export type SystemQuestionSetSummary = {
  id: SystemQuestionSetSlug;
  version: number;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  questionCount: number;
};

export const DEFAULT_SYSTEM_SET_SLUG: SystemQuestionSetSlug = "grade56-adjectives";

export const SYSTEM_QUESTION_SET_SUMMARIES: SystemQuestionSetSummary[] = [
  {
    id: "grade56-adjectives",
    version: 1,
    title: "Grade 5–6 Adjectives",
    level: "A2",
    topic: "Adjectives",
    learningObjective: "Understand adjective meanings in context and spell target words.",
    description:
      "Enormous, tiny, crowded, polite, generous, exhausted, curious, and 53 more adjectives in context.",
    questionCount: 61,
  },
  {
    id: "daily-routines-a1",
    version: 1,
    title: "Daily Routines",
    level: "A1",
    topic: "Routines",
    learningObjective: "Describe everyday routines using present-simple verbs and frequency words.",
    description: "Wake up, get dressed, have breakfast, go to school, homework, usually and never.",
    questionCount: 7,
  },
  {
    id: "school-life-a1",
    version: 1,
    title: "School Life",
    level: "A1",
    topic: "School",
    learningObjective: "Understand and use common words for school places and activities.",
    description: "Classroom, library, subjects, break time, homework, borrow and study.",
    questionCount: 7,
  },
  {
    id: "describing-places-a1",
    version: 1,
    title: "Describing Places",
    level: "A1",
    topic: "Places",
    learningObjective: "Describe where things are using there is/there are and prepositions.",
    description: "There is, there are, next to, behind, between and in front of.",
    questionCount: 7,
  },
];

export type SystemA1QuestionBank = {
  questions: EnglishCraftMcQuestion[];
  craftQuestion: EnglishCraftCraftQuestion;
};

export const SYSTEM_A1_QUESTION_BANKS: Record<
  Exclude<SystemQuestionSetSlug, "grade56-adjectives">,
  SystemA1QuestionBank
> = {
  "daily-routines-a1": {
    questions: [
      {
        id: "routine-wake",
        prompt: "What do you usually do first in the morning?",
        options: ["wake up", "go to bed", "eat dinner", "do homework"],
        correctAnswer: "wake up",
      },
      {
        id: "routine-dressed",
        prompt: "Choose the best sentence.",
        options: [
          "I get dressed before school.",
          "I get dressed the library.",
          "I dressed get school.",
          "I am get dressed.",
        ],
        correctAnswer: "I get dressed before school.",
      },
      {
        id: "routine-breakfast",
        prompt: "Which activity means eating in the morning?",
        options: ["have breakfast", "have dinner", "go home", "take a shower"],
        correctAnswer: "have breakfast",
      },
      {
        id: "routine-homework",
        prompt: "After school, I ___ my homework.",
        options: ["do", "make", "play", "go"],
        correctAnswer: "do",
      },
      {
        id: "routine-usually",
        prompt: "Which word means 'on most days'?",
        options: ["usually", "never", "now", "yesterday"],
        correctAnswer: "usually",
      },
      {
        id: "routine-never",
        prompt: "Mina does not walk to school on any day. She ___ walks to school.",
        options: ["never", "always", "usually", "sometimes"],
        correctAnswer: "never",
      },
    ],
    craftQuestion: {
      id: "routine-craft",
      prompt: "Put the routine in order to build the bridge:",
      wordBank: ["I", "usually", "do my homework", "after school"],
      correctOrder: ["I", "usually", "do my homework", "after school"],
      slotCount: 4,
    },
  },
  "school-life-a1": {
    questions: [
      {
        id: "school-library",
        prompt: "Where can you borrow a book?",
        options: ["library", "playground", "canteen", "office"],
        correctAnswer: "library",
      },
      {
        id: "school-subject",
        prompt: "Math, English and science are school ___.",
        options: ["subjects", "breaks", "rooms", "games"],
        correctAnswer: "subjects",
      },
      {
        id: "school-break",
        prompt: "When do students rest and talk between lessons?",
        options: ["break time", "homework", "assembly", "class time"],
        correctAnswer: "break time",
      },
      {
        id: "school-borrow",
        prompt: "If you borrow a pencil, what should you do later?",
        options: ["give it back", "throw it away", "hide it", "break it"],
        correctAnswer: "give it back",
      },
      {
        id: "school-study",
        prompt: "Choose the best sentence.",
        options: [
          "We study English at school.",
          "We school English study.",
          "We studies English.",
          "We study at English.",
        ],
        correctAnswer: "We study English at school.",
      },
      {
        id: "school-homework",
        prompt: "The teacher gives work to complete at home. It is ___.",
        options: ["homework", "break time", "a subject", "a library"],
        correctAnswer: "homework",
      },
    ],
    craftQuestion: {
      id: "school-craft",
      prompt: "Put the school message in order to build the bridge:",
      wordBank: ["We", "study English", "in the classroom", "every day"],
      correctOrder: ["We", "study English", "in the classroom", "every day"],
      slotCount: 4,
    },
  },
  "describing-places-a1": {
    questions: [
      {
        id: "place-there-is",
        prompt: "Choose the correct sentence for one bridge.",
        options: ["There is a bridge.", "There are a bridge.", "There a bridge is.", "There bridge."],
        correctAnswer: "There is a bridge.",
      },
      {
        id: "place-there-are",
        prompt: "Choose the correct sentence for three trees.",
        options: ["There are three trees.", "There is three trees.", "There three trees are.", "There are tree."],
        correctAnswer: "There are three trees.",
      },
      {
        id: "place-next",
        prompt: "The tree is beside the workbench. It is ___ the workbench.",
        options: ["next to", "behind", "between", "under"],
        correctAnswer: "next to",
      },
      {
        id: "place-between",
        prompt: "The flag is in the middle of two trees. It is ___ the trees.",
        options: ["between", "behind", "next to", "on"],
        correctAnswer: "between",
      },
      {
        id: "place-behind",
        prompt: "The stump is at the back of the tree. It is ___ the tree.",
        options: ["behind", "in front of", "between", "on"],
        correctAnswer: "behind",
      },
      {
        id: "place-front",
        prompt: "The workbench is before the river. It is ___ the river.",
        options: ["in front of", "behind", "under", "between"],
        correctAnswer: "in front of",
      },
    ],
    craftQuestion: {
      id: "places-craft",
      prompt: "Put the map description in order to build the bridge:",
      wordBank: ["There is", "a workbench", "next to", "the river"],
      correctOrder: ["There is", "a workbench", "next to", "the river"],
      slotCount: 4,
    },
  },
};

export function isSystemQuestionSetSlug(value: unknown): value is SystemQuestionSetSlug {
  return SYSTEM_QUESTION_SET_SUMMARIES.some((set) => set.id === value);
}

export function getSystemQuestionSetSummary(slug: SystemQuestionSetSlug): SystemQuestionSetSummary {
  return SYSTEM_QUESTION_SET_SUMMARIES.find((set) => set.id === slug)!;
}

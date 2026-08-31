export const GRADE_4_MOVERS_COURSE = {
  id: "grade-4-wke-learning-paths",
  title: "Grade 4 WKE Learning Paths",
  subtitle: "Active English for Cambridge Movers",
  description:
    "A speaking-first Grade 4 pathway built around stories, exploration, listening, and real communication.",
  coverImage: "/curriculum/grade-4-movers/unit-1/welcome-fair.png",
  units: [
    {
      id: "unit-1-meet-me",
      order: 1,
      title: "Meet Me!",
      description: "Introduce yourself, discover shared interests, and meet new friends.",
      status: "in_progress" as const,
      sessions: [
        {
          id: "session-1-enter-the-welcome-fair",
          order: 1,
          title: "Enter the Welcome Fair",
          description: "Explore the fair, meet the guide, and make your first speaking sample.",
          durationMinutes: 45,
          status: "pilot" as const,
          pilotHref: "/pilots/grade-4-learning-paths/unit-1/session-1",
          studentHref: "/primary/learn/grade-4/unit-1/session-1",
        },
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `unit-1-session-${index + 2}`,
          order: index + 2,
          title: `Session ${index + 2}`,
          description: "Planned in the Unit 1 learning journey.",
          durationMinutes: 45,
          status: "planned" as const,
          pilotHref: null,
          studentHref: null,
        })),
      ],
    },
  ],
} as const;

export type SpeechTriggerMatchMode =
  | "target_word"
  | "phrase_tokens"
  | "meaning_and_keywords";

/**
 * Authoring contract reserved for the first transcription-backed dialogue turns.
 * Session 1 currently records and plays back a baseline without pretending to score it.
 */
export type SpeechTriggerDefinition = {
  id: string;
  prompt: string;
  modelText: string;
  acceptedPhrases: string[];
  matchMode: SpeechTriggerMatchMode;
  successMessage: string;
  retryLead: string;
  focusSegments: Array<{
    label: string;
    matchText: string;
    pronunciationHint: string;
  }>;
  maxAttempts: number;
  allowSupportFallback: boolean;
};

export const SESSION_1_SPEECH_TRIGGER_DRAFTS: SpeechTriggerDefinition[] = [
  {
    id: "welcome-hello",
    prompt: "Greet the guide.",
    modelText: "Hello!",
    acceptedPhrases: ["hello", "hi", "hello there", "hi there"],
    matchMode: "meaning_and_keywords",
    successMessage: "I heard your greeting. Welcome to the fair!",
    retryLead: "Let’s make one small part clearer.",
    focusSegments: [
      {
        label: "hell-o",
        matchText: "Hello",
        pronunciationHint: "Make both parts clear: hell — oh.",
      },
    ],
    maxAttempts: 3,
    allowSupportFallback: true,
  },
  {
    id: "station-preference",
    prompt: "Tell the guide which station you like.",
    modelText: "I like painting.",
    acceptedPhrases: [
      "I like painting",
      "I love painting",
      "I like to paint",
      "I like the art table",
    ],
    matchMode: "meaning_and_keywords",
    successMessage: "Great — now I know which station you like.",
    retryLead: "Let’s make one small part clearer.",
    focusSegments: [
      {
        label: "paint",
        matchText: "paint",
        pronunciationHint: "Finish the word with a light /t/ sound.",
      },
      {
        label: "-ing",
        matchText: "ing",
        pronunciationHint: "Let the ending sound continue through your nose.",
      },
    ],
    maxAttempts: 3,
    allowSupportFallback: true,
  },
];

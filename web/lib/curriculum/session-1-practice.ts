export type Session1PracticeActivityId =
  | "vocabulary"
  | "letter-scramble"
  | "grammar-focus"
  | "fix-sentence"
  | "free-writing";

export type Session1VocabularyCard = {
  id: string;
  word: string;
  visual: string;
  meaning: string;
  example: string;
};

export function normalizeSession1Sentence(value: string) {
  return value.toLowerCase().replace(/[.!?]/g, "").replace(/\s+/g, " ").trim();
}

export const SESSION_1_VOCABULARY: Session1VocabularyCard[] = [
  {
    id: "friend",
    word: "friend",
    visual: "🧑‍🤝‍🧑",
    meaning: "a person you know and like",
    example: "I meet a new friend at the fair.",
  },
  {
    id: "badge",
    word: "badge",
    visual: "🪪",
    meaning: "a small name card that you wear",
    example: "My name is on my badge.",
  },
  {
    id: "station",
    word: "station",
    visual: "📍",
    meaning: "a place where you stop to do an activity",
    example: "Let’s visit the art station.",
  },
  {
    id: "painting",
    word: "painting",
    visual: "🎨",
    meaning: "making a picture with paint",
    example: "She likes painting.",
  },
  {
    id: "football",
    word: "football",
    visual: "⚽",
    meaning: "a game played with a ball",
    example: "He likes playing football.",
  },
  {
    id: "reading",
    word: "reading",
    visual: "📚",
    meaning: "looking at and understanding words in a book",
    example: "They like reading together.",
  },
  {
    id: "pet",
    word: "pet",
    visual: "🐹",
    meaning: "an animal that lives with and is cared for by people",
    example: "She has got a small pet.",
  },
  {
    id: "music",
    word: "music",
    visual: "🎵",
    meaning: "sounds made by voices or instruments",
    example: "They can play music together.",
  },
];

export const SESSION_1_LETTER_SCRAMBLES = [
  { id: "badge", answer: "badge", visual: "🪪", letters: ["g", "a", "d", "b", "e"] },
  { id: "friend", answer: "friend", visual: "🧑‍🤝‍🧑", letters: ["r", "i", "f", "d", "n", "e"] },
  { id: "music", answer: "music", visual: "🎵", letters: ["s", "u", "m", "i", "c"] },
  { id: "reading", answer: "reading", visual: "📚", letters: ["d", "a", "r", "i", "n", "e", "g"] },
  { id: "painting", answer: "painting", visual: "🎨", letters: ["t", "n", "p", "i", "a", "g", "i", "n"] },
  { id: "football", answer: "football", visual: "⚽", letters: ["o", "t", "b", "a", "f", "l", "o", "l"] },
] as const;

export const SESSION_1_GRAMMAR_ITEMS = [
  {
    id: "she-likes",
    visual: "🎨",
    before: "She",
    after: "painting.",
    options: ["like", "likes"],
    answer: "likes",
    support: "Use likes with he or she.",
  },
  {
    id: "they-like",
    visual: "📚",
    before: "They",
    after: "reading.",
    options: ["like", "likes"],
    answer: "like",
    support: "Use like with I, you, we, or they.",
  },
  {
    id: "likes-playing",
    visual: "⚽",
    before: "He likes",
    after: "football.",
    options: ["play", "playing"],
    answer: "playing",
    support: "After likes, use the activity form ending in -ing.",
  },
  {
    id: "i-like",
    visual: "🎵",
    before: "I",
    after: "music.",
    options: ["like", "likes"],
    answer: "like",
    support: "Use like after I.",
  },
  {
    id: "friends-like",
    visual: "🪪",
    before: "Mia and Leo",
    after: "making badges.",
    options: ["like", "likes"],
    answer: "like",
    support: "Two people take like, not likes.",
  },
] as const;

export const SESSION_1_SENTENCE_FIXES = [
  {
    id: "fix-painting",
    visual: "🎨",
    incorrect: "She like painting.",
    answer: "She likes painting.",
    hint: "Look at She. Does the verb need an extra letter?",
  },
  {
    id: "fix-reading",
    visual: "📚",
    incorrect: "They likes reading books.",
    answer: "They like reading books.",
    hint: "Use like with they.",
  },
  {
    id: "fix-football",
    visual: "⚽",
    incorrect: "He like play football.",
    answer: "He likes playing football.",
    hint: "Check both verbs: he likes + activity ending in -ing.",
  },
] as const;

export const SESSION_1_WRITING_PROMPT = {
  title: "My visit to the Welcome Fair",
  prompt:
    "Which station would you like to visit? Write about what you like, what you can do there, and someone you could meet.",
  sentenceStarters: [
    "I’d like to visit the … station.",
    "I like … because …",
    "I can … there.",
    "I could meet …",
  ],
  wordBank: [
    "art",
    "sports",
    "books",
    "pets",
    "music",
    "painting",
    "playing",
    "reading",
    "friend",
    "because",
  ],
  minimumWords: 15,
} as const;

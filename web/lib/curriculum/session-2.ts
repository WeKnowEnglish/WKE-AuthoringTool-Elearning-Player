export type Session2FriendId = "mia" | "leo" | "sam";

export type Session2Friend = {
  id: Session2FriendId;
  name: string;
  age: number;
  pronoun: "He" | "She";
  avatar: string;
  interest: string;
  interestLabel: string;
  ability: string;
  abilityLabel: string;
  visualAnchor: string;
  colour: string;
  introduction: string;
};

export const SESSION_2_FRIENDS: Session2Friend[] = [
  {
    id: "mia",
    name: "Mia",
    age: 9,
    pronoun: "She",
    avatar: "🎨",
    interest: "painting animals",
    interestLabel: "painting animals",
    ability: "draw a cat",
    abilityLabel: "draw a cat",
    visualAnchor: "orange paint mark",
    colour: "from-orange-300 to-rose-300",
    introduction: "Hi! I'm Mia. I'm nine. I like painting animals. I can draw a cat.",
  },
  {
    id: "leo",
    name: "Leo",
    age: 10,
    pronoun: "He",
    avatar: "⚽",
    interest: "playing football",
    interestLabel: "playing football",
    ability: "kick with both feet",
    abilityLabel: "kick with both feet",
    visualAnchor: "green ball badge",
    colour: "from-emerald-300 to-cyan-300",
    introduction: "Hello! I'm Leo. I'm ten. I like playing football. I can kick with both feet.",
  },
  {
    id: "sam",
    name: "Sam",
    age: 9,
    pronoun: "He",
    avatar: "📚",
    interest: "reading funny stories",
    interestLabel: "reading funny stories",
    ability: "make character voices",
    abilityLabel: "make character voices",
    visualAnchor: "purple star book",
    colour: "from-violet-300 to-fuchsia-300",
    introduction: "Hi there! I'm Sam. I'm nine. I like reading funny stories. I can make character voices.",
  },
];

export const SESSION_2_QUESTION = {
  model: "What do you like doing?",
  chunks: ["What", "do you like", "doing?"],
  shuffledChunks: ["doing?", "What", "do you like"],
} as const;

export const SESSION_2_PROFILE_TOKENS = [
  { id: "name", icon: "🪪", label: "name", question: "What's your name?" },
  { id: "age", icon: "🎂", label: "age", question: "How old are you?" },
  { id: "interest", icon: "❤️", label: "likes", question: "What do you like doing?" },
  { id: "ability", icon: "⭐", label: "can", question: "What can you do?" },
] as const;

export const SESSION_2_CHECKS = [
  {
    id: "mia-interest",
    prompt: "What does Mia like doing?",
    options: ["painting animals", "playing football", "reading funny stories"],
    answer: "painting animals",
    hint: "Look for Mia's orange paint mark.",
  },
  {
    id: "leo-ability",
    prompt: "What can Leo do?",
    options: ["draw a cat", "kick with both feet", "make character voices"],
    answer: "kick with both feet",
    hint: "Remember Leo's football badge.",
  },
  {
    id: "sam-interest",
    prompt: "Who likes reading funny stories?",
    options: ["Mia", "Leo", "Sam"],
    answer: "Sam",
    hint: "Look for the purple star book.",
  },
] as const;

export type Session2MatrixItem = {
  order: number;
  track: "adventure" | "practice" | "reflection";
  id: string;
  activity: string;
  objective: string;
  learnerAction: string;
  primitive: string;
  evidence: string;
  iteration: "playable_v1" | "next";
};

export const SESSION_2_ACTIVITY_MATRIX: Session2MatrixItem[] = [
  { order: 1, track: "adventure", id: "badge-return", activity: "Badge return", objective: "Retrieve identity language", learnerAction: "Return to the fair with Keelan", primitive: "guided_dialog", evidence: "session started", iteration: "playable_v1" },
  { order: 2, track: "adventure", id: "profile-search", activity: "Friend Finder search", objective: "Preview personal details", learnerAction: "Find four profile tokens", primitive: "visual_hotspots", evidence: "four tokens found", iteration: "playable_v1" },
  { order: 3, track: "adventure", id: "question-builder", activity: "Question builder", objective: "Notice question order", learnerAction: "Build What do you like doing?", primitive: "phrase_scramble", evidence: "correct order", iteration: "playable_v1" },
  { order: 4, track: "adventure", id: "ask-friend", activity: "Ask a friend", objective: "Rehearse the target question", learnerAction: "Record and replay the target question", primitive: "record_and_replay", evidence: "local recording captured", iteration: "playable_v1" },
  { order: 5, track: "adventure", id: "listen-fill", activity: "Listen and fill", objective: "Listen for specific details", learnerAction: "Complete three friend profiles", primitive: "audio_image_choice", evidence: "profile accuracy", iteration: "playable_v1" },
  { order: 6, track: "adventure", id: "find-match", activity: "Find a match", objective: "Make a personal choice", learnerAction: "Choose a friend to meet again", primitive: "learner_choice", evidence: "friend selected", iteration: "playable_v1" },
  { order: 7, track: "adventure", id: "introduce-friend", activity: "Introduce my friend", objective: "Transfer to third person", learnerAction: "Build This is ... He/She likes ...", primitive: "sentence_frame", evidence: "introduction built", iteration: "playable_v1" },
  { order: 8, track: "adventure", id: "random-check", activity: "Three clue check", objective: "Retrieve friend details", learnerAction: "Answer three profile questions", primitive: "random_check", evidence: "three correct answers", iteration: "playable_v1" },
  { order: 9, track: "practice", id: "vocabulary", activity: "Vocabulary cards", objective: "Learn profile chunks", learnerAction: "Flip, hear, and say chunks", primitive: "vocabulary_cards", evidence: "confidence choice", iteration: "next" },
  { order: 10, track: "practice", id: "question-scramble", activity: "Question scramble", objective: "Automate question order", learnerAction: "Arrange four questions", primitive: "phrase_scramble", evidence: "accuracy and attempts", iteration: "next" },
  { order: 11, track: "practice", id: "listen-match", activity: "Listen and match", objective: "Discriminate personal details", learnerAction: "Match answers to profiles", primitive: "audio_match", evidence: "listening score", iteration: "next" },
  { order: 12, track: "practice", id: "grammar-focus", activity: "Grammar in focus", objective: "Contrast do you like and likes", learnerAction: "Choose forms in paired examples", primitive: "grammar_choice", evidence: "accuracy by form", iteration: "next" },
  { order: 13, track: "practice", id: "fix-dialogue", activity: "Fix the conversation", objective: "Notice missing words", learnerAction: "Repair three mini-dialogues", primitive: "fix_sentence", evidence: "correct repair", iteration: "next" },
  { order: 14, track: "practice", id: "read-profile", activity: "Read a profile", objective: "Read for details", learnerAction: "Read and answer three questions", primitive: "read_answer", evidence: "reading score", iteration: "next" },
  { order: 15, track: "practice", id: "write-profile", activity: "Write a friend card", objective: "Produce connected language", learnerAction: "Write three to five sentences", primitive: "free_response", evidence: "saved response", iteration: "next" },
  { order: 16, track: "reflection", id: "learning-choice", activity: "Learning choice", objective: "Recognise progress", learnerAction: "Choose an I can card", primitive: "visual_reflection", evidence: "self-report", iteration: "playable_v1" },
  { order: 17, track: "practice", id: "question-feedback", activity: "Question pronunciation feedback", objective: "Make question chunks clearer", learnerAction: "Request a transcription-backed speaking check", primitive: "speech_trigger", evidence: "matched chunks and retry", iteration: "next" },
];

export type Session2PracticeActivityId = "vocabulary" | "question-scramble" | "listen-match" | "grammar-focus" | "fix-dialogue" | "read-profile" | "write-profile";

export const SESSION_2_PRACTICE_ACTIVITIES: Array<{ id: Session2PracticeActivityId; title: string; shortTitle: string; icon: string; purpose: string }> = [
  { id: "vocabulary", title: "Friend Finder cards", shortTitle: "Cards", icon: "🃏", purpose: "Learn the question and profile chunks." },
  { id: "question-scramble", title: "Build the questions", shortTitle: "Questions", icon: "🧩", purpose: "Put useful personal questions in order." },
  { id: "listen-match", title: "Who is speaking?", shortTitle: "Listen", icon: "🎧", purpose: "Listen and match details to a friend." },
  { id: "grammar-focus", title: "Question or report?", shortTitle: "Grammar", icon: "🔎", purpose: "Compare do you like with he or she likes." },
  { id: "fix-dialogue", title: "Fix the conversation", shortTitle: "Fix it", icon: "🛠️", purpose: "Repair missing words in mini-dialogues." },
  { id: "read-profile", title: "Read a friend card", shortTitle: "Read", icon: "📖", purpose: "Read closely and find profile details." },
  { id: "write-profile", title: "Create a friend card", shortTitle: "Write", icon: "✍️", purpose: "Write about a real or imaginary friend." },
];

export const SESSION_2_VOCABULARY = [
  { id: "name", front: "What's your name?", back: "My name is Mia.", icon: "🪪" },
  { id: "age", front: "How old are you?", back: "I'm nine.", icon: "🎂" },
  { id: "likes", front: "What do you like doing?", back: "I like painting.", icon: "❤️" },
  { id: "can", front: "What can you do?", back: "I can draw a cat.", icon: "⭐" },
  { id: "introduce", front: "This is Mia.", back: "Use this to introduce a person.", icon: "👋" },
  { id: "report", front: "She likes painting.", back: "Use likes with he or she.", icon: "🎨" },
] as const;

export const SESSION_2_QUESTION_SCRAMBLES = [
  { id: "name", answer: "What's your name?", chunks: ["your", "name?", "What's"] },
  { id: "age", answer: "How old are you?", chunks: ["are", "you?", "How old"] },
  { id: "likes", answer: "What do you like doing?", chunks: ["doing?", "What", "do you like"] },
  { id: "can", answer: "What can you do?", chunks: ["you", "do?", "What can"] },
] as const;

export const SESSION_2_GRAMMAR_ITEMS = [
  { id: "ask-like", before: "What", after: "you like doing?", options: ["do", "does"], answer: "do", support: "Use do when you ask you." },
  { id: "mia-likes", before: "Mia", after: "painting animals.", options: ["like", "likes"], answer: "likes", support: "Use likes with one person: he or she." },
  { id: "leo-can", before: "Leo", after: "kick with both feet.", options: ["can", "cans"], answer: "can", support: "Can never takes an extra s." },
  { id: "ask-can", before: "What can", after: "do?", options: ["you", "she"], answer: "you", support: "The question is asking the person who is listening." },
  { id: "sam-likes", before: "He likes", after: "funny stories.", options: ["read", "reading"], answer: "reading", support: "After likes, use the activity form ending in -ing." },
] as const;

export const SESSION_2_DIALOGUE_FIXES = [
  { id: "fix-question", incorrect: "What you like doing?", answer: "What do you like doing?", hint: "The question needs one small helping word before you." },
  { id: "fix-mia", incorrect: "She like painting animals.", answer: "She likes painting animals.", hint: "Use likes with she." },
  { id: "fix-leo", incorrect: "Leo can kicks with both feet.", answer: "Leo can kick with both feet.", hint: "After can, use the simple verb." },
] as const;

export const SESSION_2_READING = {
  title: "Sam's friend card",
  text: "This is Sam. He is nine years old. He likes reading funny stories. Sam can make character voices. He would like to meet a friend who enjoys books and laughing.",
  questions: [
    { id: "age", prompt: "How old is Sam?", options: ["eight", "nine", "ten"], answer: "nine" },
    { id: "likes", prompt: "What does Sam like?", options: ["funny stories", "football", "painting cats"], answer: "funny stories" },
    { id: "can", prompt: "What can Sam do?", options: ["draw animals", "make character voices", "kick with both feet"], answer: "make character voices" },
  ],
} as const;

export const SESSION_2_WRITING_PROMPT = {
  title: "Make a friend card",
  prompt: "Write about a real or imaginary friend. Tell us their name, age, something they like doing, and something they can do.",
  starters: ["This is ...", "He/She is ... years old.", "He/She likes ...", "He/She can ..."],
  wordBank: ["painting", "playing", "reading", "drawing", "football", "stories", "music", "animals", "likes", "can"],
  minimumWords: 18,
} as const;

export function normalizeSession2Sentence(value: string) {
  return value.toLowerCase().replace(/[.!?]/g, "").replace(/\s+/g, " ").trim();
}

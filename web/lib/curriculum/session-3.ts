export type Session3ActivityId = "painting" | "football" | "reading";
export type Session3FriendId = "mia" | "leo" | "sam";

export type Session3Activity = {
  id: Session3ActivityId;
  label: string;
  phrase: string;
  icon: string;
  colour: string;
  friendId: Session3FriendId;
};

export const SESSION_3_ACTIVITIES: Session3Activity[] = [
  { id: "painting", label: "Painting animals", phrase: "painting animals", icon: "🎨", colour: "from-orange-300 to-amber-100", friendId: "mia" },
  { id: "football", label: "Playing football", phrase: "playing football", icon: "⚽", colour: "from-emerald-300 to-lime-100", friendId: "leo" },
  { id: "reading", label: "Reading funny stories", phrase: "reading funny stories", icon: "📚", colour: "from-violet-300 to-fuchsia-100", friendId: "sam" },
];

export type Session3Friend = {
  id: Session3FriendId;
  name: string;
  avatar: string;
  activityId: Session3ActivityId;
  colour: string;
};

export const SESSION_3_FRIENDS: Session3Friend[] = [
  { id: "mia", name: "Mia", avatar: "👧🏽", activityId: "painting", colour: "from-orange-300 to-rose-100" },
  { id: "leo", name: "Leo", avatar: "👦🏻", activityId: "football", colour: "from-emerald-300 to-sky-100" },
  { id: "sam", name: "Sam", avatar: "🧒🏾", activityId: "reading", colour: "from-violet-300 to-indigo-100" },
];

export const SESSION_3_QUESTION = {
  fixedChunks: ["Do", "you like"],
  shuffledChunks: ["you like", "Do"],
} as const;

export const SESSION_3_CHECKS = [
  { id: "football-friend", prompt: "Who says yes to playing football?", options: ["Mia", "Leo", "Sam"], answer: "Leo", hint: "Look for the green football badge." },
  { id: "negative-answer", prompt: "Which answer means no?", options: ["Yes, I do.", "No, I don't.", "Me too!"], answer: "No, I don't.", hint: "Listen for the word don't." },
  { id: "shared-interest", prompt: "Which sentence shows a shared interest?", options: ["We both like reading.", "Sam likes reading.", "Do you like reading?"], answer: "We both like reading.", hint: "Both means two people share it." },
] as const;

export const SESSION_3_MATRIX = [
  { order: 1, track: "adventure", activity: "Central play gate", objective: "Begin with focused attention", primitive: "guided_dialogue", evidence: "started", iteration: "playable_v1" },
  { order: 2, track: "adventure", activity: "Find three activity badges", objective: "Retrieve familiar activity language", primitive: "hotspot", evidence: "three badges", iteration: "playable_v1" },
  { order: 3, track: "personalise", activity: "Choose a favourite", objective: "Make language personally meaningful", primitive: "visual_choice", evidence: "favourite selected", iteration: "playable_v1" },
  { order: 4, track: "language", activity: "Build Do you like...?", objective: "Control yes/no question word order", primitive: "letter_scramble", evidence: "question built", iteration: "playable_v1" },
  { order: 5, track: "speaking", activity: "Record the question", objective: "Produce a follow-up question", primitive: "local_audio_recording", evidence: "recording created", iteration: "playable_v1" },
  { order: 6, track: "dialogue", activity: "Ask three friends", objective: "Distinguish yes and no responses", primitive: "branching_dialogue", evidence: "three responses matched", iteration: "playable_v1" },
  { order: 7, track: "social", activity: "React naturally", objective: "Use Me too or That's okay", primitive: "response_choice", evidence: "appropriate reaction", iteration: "playable_v1" },
  { order: 8, track: "meaning", activity: "Find the common friend", objective: "Connect personal and heard information", primitive: "match", evidence: "friend matched", iteration: "playable_v1" },
  { order: 9, track: "grammar", activity: "Build We both like...", objective: "Express shared interest", primitive: "sentence_builder", evidence: "sentence completed", iteration: "playable_v1" },
  { order: 10, track: "speaking", activity: "Record common ground", objective: "Say a connected personal sentence", primitive: "local_audio_recording", evidence: "recording created", iteration: "playable_v1" },
  { order: 11, track: "assessment", activity: "Three clue check", objective: "Retrieve meaning and form", primitive: "three_item_check", evidence: "three correct", iteration: "playable_v1" },
  { order: 12, track: "reflection", activity: "Friendship power", objective: "Recognise strategy use", primitive: "visual_reflection", evidence: "self-report", iteration: "playable_v1" },
  { order: 13, track: "practice", activity: "Seven common-ground power-ups", objective: "Consolidate across skills", primitive: "practice_pack", evidence: "seven complete", iteration: "playable_v1" },
  { order: 14, track: "speaking", activity: "Pronunciation feedback", objective: "Clarify question and both", primitive: "speech_trigger", evidence: "matched chunks", iteration: "next" },
] as const;

export type Session3PracticeActivityId = "vocabulary" | "question-scramble" | "listen-answer" | "grammar-focus" | "fix-chat" | "read-note" | "write-chat";

export const SESSION_3_PRACTICE_ACTIVITIES: Array<{ id: Session3PracticeActivityId; title: string; shortTitle: string; icon: string; purpose: string }> = [
  { id: "vocabulary", title: "Common-ground cards", shortTitle: "Cards", icon: "🃏", purpose: "Learn the useful conversation chunks." },
  { id: "question-scramble", title: "Build the questions", shortTitle: "Questions", icon: "🧩", purpose: "Put yes/no questions in order." },
  { id: "listen-answer", title: "Yes or no?", shortTitle: "Listen", icon: "🎧", purpose: "Hear whether each friend agrees." },
  { id: "grammar-focus", title: "Grammar in focus", shortTitle: "Grammar", icon: "🔎", purpose: "Choose do, does, like, likes, and both." },
  { id: "fix-chat", title: "Fix the chat", shortTitle: "Fix it", icon: "🛠️", purpose: "Repair short friendship exchanges." },
  { id: "read-note", title: "Read a friendship note", shortTitle: "Read", icon: "📖", purpose: "Find details and shared interests." },
  { id: "write-chat", title: "Write a mini-chat", shortTitle: "Write", icon: "✍️", purpose: "Create a short conversation." },
];

export const SESSION_3_VOCABULARY = [
  { front: "Do you like painting?", back: "Ask if someone likes an activity.", icon: "❓" },
  { front: "Yes, I do.", back: "A positive answer.", icon: "👍" },
  { front: "No, I don't.", back: "A negative answer.", icon: "👎" },
  { front: "Me too!", back: "We share the same idea.", icon: "🙌" },
  { front: "That's okay.", back: "A friendly response when we are different.", icon: "🙂" },
  { front: "We both like reading.", back: "Both means the two of us.", icon: "🤝" },
] as const;

export const SESSION_3_SCRAMBLES = [
  { answer: "Do you like painting?", chunks: ["painting?", "Do", "you like"] },
  { answer: "Do you like playing football?", chunks: ["you like", "playing football?", "Do"] },
  { answer: "Yes, I do.", chunks: ["do.", "Yes,", "I"] },
  { answer: "We both like reading.", chunks: ["like", "We both", "reading."] },
] as const;

export const SESSION_3_GRAMMAR_ITEMS = [
  { before: "", after: "you like painting?", options: ["Do", "Does"], answer: "Do", support: "Use do when the question asks you." },
  { before: "", after: "Mia like football?", options: ["Do", "Does"], answer: "Does", support: "Use does with one other person." },
  { before: "Leo", after: "playing football.", options: ["like", "likes"], answer: "likes", support: "Use likes with one person." },
  { before: "We", after: "like reading.", options: ["both", "does"], answer: "both", support: "Both means two people share something." },
  { before: "Yes, I", after: ".", options: ["do", "does"], answer: "do", support: "Short answers copy do from Do you...?" },
] as const;

export const SESSION_3_FIXES = [
  { incorrect: "You like painting?", answer: "Do you like painting?", hint: "Add the helping word at the beginning." },
  { incorrect: "Yes, I like.", answer: "Yes, I do.", hint: "Use the short answer with do." },
  { incorrect: "We both likes reading.", answer: "We both like reading.", hint: "With we, use like without s." },
] as const;

export const SESSION_3_READING = {
  title: "A new fair team",
  text: "Asha likes painting animals. She asks Mia, ‘Do you like painting?’ Mia says, ‘Yes, I do!’ Asha says, ‘Me too!’ They both like painting, so they make a bright animal poster together. Leo does not like painting, but he smiles and helps them choose a football mascot.",
  questions: [
    { prompt: "What does Asha ask Mia?", options: ["Do you like painting?", "Can you paint me?", "What is your name?"], answer: "Do you like painting?" },
    { prompt: "What do Asha and Mia both like?", options: ["football", "painting", "reading"], answer: "painting" },
    { prompt: "How does Leo help?", options: ["He paints the poster.", "He chooses a mascot.", "He reads a story."], answer: "He chooses a mascot." },
  ],
} as const;

export const SESSION_3_WRITING_PROMPT = {
  title: "Write a common-ground chat",
  prompt: "Write a short chat between you and a friend. Ask about an activity, answer, react kindly, and finish with what you both like or how you are different.",
  starters: ["Do you like ...?", "Yes, I do. / No, I don't.", "Me too! / That's okay.", "We both like ..."],
  wordBank: ["painting", "playing football", "reading", "music", "animals", "stories", "both", "like", "do", "don't"],
  minimumWords: 20,
} as const;

export function normalizeSession3Sentence(value: string) {
  return value.toLowerCase().replace(/[.!?’']/g, "").replace(/\s+/g, " ").trim();
}

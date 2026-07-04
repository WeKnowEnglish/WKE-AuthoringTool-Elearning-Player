import type { Question } from "@/lib/board-game/types";

/**
 * Grade 5–6 ESL Story Builder deck (mid-A2).
 * Open-ended cards use fill_blank with the full prompt as `sentence` and a sample
 * answer in `correctAnswer` for the teacher reference line.
 */
export const STORY_BUILDER_A2_QUESTIONS: Question[] = [
  {
    id: "a2-detail-1",
    type: "fill_blank",
    sentence: "The boy found a dog. Add TWO adjectives to improve the sentence.",
    correctAnswer: "The young boy found a small, frightened dog.",
  },
  {
    id: "a2-detail-2",
    type: "fill_blank",
    sentence: "The family ate dinner. Tell us WHERE they ate.",
    correctAnswer: "The family ate dinner in a busy restaurant.",
  },
  {
    id: "a2-detail-3",
    type: "fill_blank",
    sentence: "The girl opened the box. Tell us WHAT was inside.",
    correctAnswer: "The girl opened the box and found an old map.",
  },
  {
    id: "a2-detail-4",
    type: "fill_blank",
    sentence: "The bird flew away. Add HOW it flew.",
    correctAnswer: "The bird flew away quickly.",
  },
  {
    id: "a2-detail-5",
    type: "fill_blank",
    sentence: "The students walked home. Add WHO they were with.",
    correctAnswer: "The students walked home with their friends.",
  },
  {
    id: "a2-reason-1",
    type: "fill_blank",
    sentence: "Finish the sentence: The boy was happy because ___",
    correctAnswer: "he got a good grade on his story.",
  },
  {
    id: "a2-reason-2",
    type: "fill_blank",
    sentence: "Finish the sentence: The teacher smiled because ___",
    correctAnswer: "the class worked hard on their writing.",
  },
  {
    id: "a2-reason-3",
    type: "fill_blank",
    sentence: "Finish the sentence: The family stayed inside because ___",
    correctAnswer: "it was raining heavily outside.",
  },
  {
    id: "a2-reason-4",
    type: "fill_blank",
    sentence: "Finish the sentence: The dog barked because ___",
    correctAnswer: "a stranger walked past the gate.",
  },
  {
    id: "a2-reason-5",
    type: "fill_blank",
    sentence: "Finish the sentence: I couldn't sleep because ___",
    correctAnswer: "I was worried about the test tomorrow.",
  },
  {
    id: "a2-time-1",
    type: "fill_blank",
    sentence: "Complete the sentence: Before I went to school, ___",
    correctAnswer: "I ate breakfast with my family.",
  },
  {
    id: "a2-time-2",
    type: "fill_blank",
    sentence: "Complete the sentence: After we finished dinner, ___",
    correctAnswer: "we watched a movie together.",
  },
  {
    id: "a2-time-3",
    type: "fill_blank",
    sentence: "Complete the sentence: When the rain stopped, ___",
    correctAnswer: "we went outside to play football.",
  },
  {
    id: "a2-time-4",
    type: "fill_blank",
    sentence: "Complete the sentence: While I was walking home, ___",
    correctAnswer: "I saw my friend waiting at the corner.",
  },
  {
    id: "a2-time-5",
    type: "fill_blank",
    sentence: "Complete the sentence: Yesterday evening, ___",
    correctAnswer: "I wrote three paragraphs for my story.",
  },
  {
    id: "a2-verb-1",
    type: "multiple_choice",
    prompt: "Replace the weak verb: The boy WENT to the door.",
    options: ["ran", "hurried", "walked", "All of the above"],
    correctAnswer: "All of the above",
  },
  {
    id: "a2-verb-2",
    type: "multiple_choice",
    prompt: "Replace the weak verb: The girl LOOKED at the picture.",
    options: ["stared", "noticed", "admired", "All of the above"],
    correctAnswer: "All of the above",
  },
  {
    id: "a2-verb-3",
    type: "multiple_choice",
    prompt: "Replace the weak verb: The baby SAID hello.",
    options: ["whispered", "shouted", "called", "All of the above"],
    correctAnswer: "All of the above",
  },
  {
    id: "a2-verb-4",
    type: "multiple_choice",
    prompt: "Replace the weak verb: The dog WENT across the road.",
    options: ["ran", "hurried", "jumped", "All of the above"],
    correctAnswer: "All of the above",
  },
  {
    id: "a2-verb-5",
    type: "multiple_choice",
    prompt: "Replace the weak verb: The pirate LOOKED at the treasure.",
    options: ["stared", "examined", "admired", "All of the above"],
    correctAnswer: "All of the above",
  },
  {
    id: "a2-join-1",
    type: "fill_blank",
    sentence: "Join using BECAUSE: The boy was cold. He put on his jacket.",
    correctAnswer: "The boy put on his jacket because he was cold.",
  },
  {
    id: "a2-join-2",
    type: "fill_blank",
    sentence: "Join using BUT: The cake looked delicious. It tasted terrible.",
    correctAnswer: "The cake looked delicious, but it tasted terrible.",
  },
  {
    id: "a2-join-3",
    type: "fill_blank",
    sentence: "Join using SO: It was raining. We stayed inside.",
    correctAnswer: "It was raining, so we stayed inside.",
  },
  {
    id: "a2-join-4",
    type: "fill_blank",
    sentence: "Join using WHEN: The lights went out. Everyone screamed.",
    correctAnswer: "Everyone screamed when the lights went out.",
  },
  {
    id: "a2-join-5",
    type: "fill_blank",
    sentence: "Join using AFTER: We finished the game. We went home.",
    correctAnswer: "After we finished the game, we went home.",
  },
  {
    id: "a2-story-1",
    type: "fill_blank",
    sentence: "Continue the story with TWO more sentences: Yesterday I found a strange key.",
    correctAnswer:
      "I picked it up and opened an old door. Inside, I discovered a hidden library.",
  },
  {
    id: "a2-story-2",
    type: "fill_blank",
    sentence: "Continue the story with TWO more sentences: The door slowly opened.",
    correctAnswer: "A bright light shone from the room. We stepped inside carefully.",
  },
  {
    id: "a2-story-3",
    type: "fill_blank",
    sentence: "Continue the story with TWO more sentences: Suddenly, my best friend shouted my name.",
    correctAnswer: "I turned around and saw him running toward me. He looked very excited.",
  },
  {
    id: "a2-story-4",
    type: "fill_blank",
    sentence: "Continue the story with TWO more sentences: We heard a loud noise outside.",
    correctAnswer: "We ran to the window and looked out. A tree had fallen in the storm.",
  },
  {
    id: "a2-story-5",
    type: "fill_blank",
    sentence: "Continue the story with TWO more sentences: A mysterious box was waiting for us.",
    correctAnswer: "We opened it slowly and found an old photograph. It showed our school from fifty years ago.",
  },
  {
    id: "a2-fix-1",
    type: "multiple_choice",
    prompt: "Choose the correct sentence.",
    options: [
      "Yesterday I go to school.",
      "Yesterday I went to school.",
      "Yesterday I goed to school.",
      "Yesterday I going to school.",
    ],
    correctAnswer: "Yesterday I went to school.",
  },
  {
    id: "a2-fix-2",
    type: "multiple_choice",
    prompt: "Choose the correct sentence.",
    options: [
      "She don't like spiders.",
      "She doesn't likes spiders.",
      "She doesn't like spiders.",
      "She not like spiders.",
    ],
    correctAnswer: "She doesn't like spiders.",
  },
  {
    id: "a2-fix-3",
    type: "multiple_choice",
    prompt: "Choose the correct sentence.",
    options: [
      "We was playing football.",
      "We were playing football.",
      "We playing football.",
      "We is playing football.",
    ],
    correctAnswer: "We were playing football.",
  },
  {
    id: "a2-fix-4",
    type: "multiple_choice",
    prompt: "Choose the correct sentence.",
    options: [
      "The dog eat my sandwich.",
      "The dog ate my sandwich.",
      "The dog eated my sandwich.",
      "The dog eating my sandwich.",
    ],
    correctAnswer: "The dog ate my sandwich.",
  },
  {
    id: "a2-fix-5",
    type: "multiple_choice",
    prompt: "Choose the correct sentence.",
    options: [
      "He buyed a new bike.",
      "He buying a new bike.",
      "He bought a new bike.",
      "He buy a new bike.",
    ],
    correctAnswer: "He bought a new bike.",
  },
  {
    id: "a2-relative-1",
    type: "fill_blank",
    sentence: "Add extra information: I met a boy ___",
    correctAnswer: "who was wearing a blue jacket.",
  },
  {
    id: "a2-relative-2",
    type: "fill_blank",
    sentence: "Add extra information: I saw a dog ___",
    correctAnswer: "that was chasing a ball in the park.",
  },
  {
    id: "a2-relative-3",
    type: "fill_blank",
    sentence: "Add extra information: We visited a museum ___",
    correctAnswer: "where we learned about ancient Egypt.",
  },
  {
    id: "a2-interest-1",
    type: "fill_blank",
    sentence: "Make this sentence much more interesting: I went to the park.",
    correctAnswer:
      "Yesterday afternoon, I went to the beautiful park with my cousins because the weather was sunny.",
  },
  {
    id: "a2-interest-2",
    type: "fill_blank",
    sentence: "Make this sentence much more interesting: It was scary.",
    correctAnswer:
      "It was scary because the old house creaked loudly and the lights suddenly went out.",
  },
];

export const STORY_BUILDER_A2_DECK_META = {
  title: "Grade 5-6 ESL Story Builder (A2)",
  description: "Sentence expansion and storytelling challenges for mid-A2 learners.",
  questionCount: STORY_BUILDER_A2_QUESTIONS.length,
};

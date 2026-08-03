export const SECONDARY_HOMEWORK_ONE_ID = "secondary-homework-template-one" as const;

export const COMMUNITY_SPEAKING_RESPONSE_ID = "favorite-community-response";
export const COMMUNITY_SPEAKING_MAX_SECONDS = 120;

export const SECONDARY_HOMEWORK_ONE = {
  reading: {
    title: "A community clean-up",
    instructions: "Read the article, then put the five events in the order they happened.",
    paragraphs: [
      "Last week, I volunteered for a community clean-up at a popular beach near my city. Our group met very early in the morning, so there were not many tourists there yet. The beach looked quiet and peaceful, but we soon noticed a lot of rubbish. There were plastic bottles, cans, food boxes, and bags on the ground around the trash bins. There was also a large pile of old fishing nets on the sand. Some of the nets were broken, and small pieces of plastic were mixed inside them. The worst problem was the beach erosion. In some places, the sand was slowly disappearing, and the water was getting closer to the walking path.",
      "We worked for several hours. I worked very hard and filled four large trash bags by myself. Other volunteers collected fishing nets and separated plastic, metal, and glass for recycling. However, at the end of the clean-up, there was still a lot more rubbish to collect.",
      "I asked the volunteer manager why the beach had so much trash. He explained that many tourists came to the beach at night to eat, drink, and relax. Some visitors left their rubbish behind. He also said that some people who sold food and drinks did not clean the area when they closed their shops late at night. In addition, rubbish sometimes came from fishing boats or was carried onto the beach by the sea.",
      "Later that day, I created a picture and video blog to share the work of our volunteer group. I posted photos of the beach before and after the clean-up. I also wrote about the problems we found and suggested ways people could help. The website has only been online for one week, but about 100 people have already joined our online community. Some people have offered to volunteer, while others have shared our posts with their friends.",
      "More people are joining our movement every day. We know that we cannot solve every problem immediately, but small actions can still make a difference. Would you like to help make our beaches and cities cleaner, safer, and better for everyone?",
    ],
    events: [
      { id: "A", text: "The volunteer leader explained that visitors and beach sellers sometimes left rubbish behind at night." },
      { id: "B", text: "After returning home, the writer created a website with photos and videos about the group’s work." },
      { id: "C", text: "Early one morning, the volunteers arrived at a well-known beach and found rubbish across the sand." },
      { id: "D", text: "The writer collected four big bags of waste, although the beach was still not completely clean." },
      { id: "E", text: "Within one week, around one hundred people had joined the volunteer group online." },
    ],
    correctOrder: ["C", "D", "A", "B", "E"],
  },
  corrections: {
    instructions: "Each sentence has one verb mistake. Write the correct simple-past verb.",
    questions: [
      { id: "correction-1", sentence: "Our class goed to the community centre last Saturday.", answer: "went" },
      { id: "correction-2", sentence: "We stay there for three hours and helped the volunteers.", answer: "stayed" },
      { id: "correction-3", sentence: "Some children play football in the park during the event.", answer: "played" },
      { id: "correction-4", sentence: "The new recycling bins costed a lot of money.", answer: "cost" },
      { id: "correction-5", sentence: "The students maked posters about keeping the neighbourhood clean.", answer: "made" },
      { id: "correction-6", sentence: "After the clean-up, we have watched a short video about pollution.", answer: "watched" },
    ],
  },
  dialogue: {
    instructions: "Complete each blank with the correct past-tense form of the verb in brackets.",
    lines: [
      { speaker: "Mia", before: "Hi, Ethan! I (1)", after: "you at the community centre yesterday.", clue: "see", id: "dialogue-1", answer: "saw" },
      { speaker: "Ethan", before: "Yes! I (2)", after: "the bus there after school.", clue: "take", id: "dialogue-2", answer: "took" },
      { speaker: "Mia", before: "Who (3)", after: "with you?", clue: "go", id: "dialogue-3", answer: "went" },
      { speaker: "Ethan", before: "I (4)", after: "there with Leo.", clue: "be", id: "dialogue-4", answer: "was" },
      { speaker: "Mia", before: "(5)", after: "you tired after the clean-up?", clue: "be", id: "dialogue-5", answer: "were" },
      { speaker: "Ethan", before: "A little, but we (6)", after: "to stay and help the donation team.", clue: "decide", id: "dialogue-6", answer: "decided" },
      { speaker: "Mia", before: "(7)", after: "any photos?", clue: "you/take?", id: "dialogue-7", answer: "did you take" },
      { speaker: "Ethan", before: "No, my phone (8)", after: "with me.", clue: "not be", id: "dialogue-8", answer: "wasn't", accepted: ["wasn't", "was not"] },
      { speaker: "Mia", before: "(9)", after: "at the food-donation table?", clue: "be/you", id: "dialogue-9", answer: "were you" },
      { speaker: "Ethan", before: "Yes. I (10)", after: "the manager from last year’s event.", clue: "know", id: "dialogue-10", answer: "knew" },
      { speaker: "Mia", before: "I (11)", after: "the event would be so busy!", clue: "not think", id: "dialogue-11", answer: "didn't think", accepted: ["didn't think", "did not think"] },
      { speaker: "Ethan", before: "(12)", after: "enough boxes for all the donations?", clue: "you/have", id: "dialogue-12", answer: "did you have" },
      { speaker: "Mia", before: "Yes, and our teacher (13)", after: "ten more boxes in the afternoon.", clue: "buy", id: "dialogue-13", answer: "bought" },
    ],
  },
  questions: {
    instructions: "Choose the correct word to make each past-tense question.",
    items: [
      { id: "question-1", before: "What time", choices: ["did", "were"], after: "you arrive at the beach yesterday?", answer: "did" },
      { id: "question-2", before: "", choices: ["Was", "Did"], after: "the community clean-up successful?", answer: "Was" },
      { id: "question-3", before: "Where", choices: ["did", "was"], after: "the volunteers put the rubbish bags?", answer: "did" },
      { id: "question-4", before: "", choices: ["Were", "Did"], after: "there many people at the event?", answer: "Were" },
      { id: "question-5", before: "Why", choices: ["did", "were"], after: "Mia create a community website?", answer: "did" },
      { id: "question-6", before: "", choices: ["Was", "Did"], after: "Ethan help at the donation table?", answer: "Did" },
      { id: "question-7", before: "How many bags", choices: ["did", "were"], after: "the group collect?", answer: "did" },
      { id: "question-8", before: "", choices: ["Were", "Did"], after: "the streets cleaner after the event?", answer: "Were" },
    ],
  },
  speaking: {
    instructions: "Describe your favourite community. What is it? Why do you like it? How do you interact with your community?",
    planningPrompts: ["Name and describe the community.", "Explain why you like it.", "Give examples of how you take part."],
    responseId: COMMUNITY_SPEAKING_RESPONSE_ID,
    maxDurationSeconds: COMMUNITY_SPEAKING_MAX_SECONDS,
    teacherScoreTotal: 5,
  },
} as const;

export function normalizeSecondaryAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function scoreSecondaryAnswers(
  answers: Record<string, string>,
  items: readonly { id: string; answer: string; accepted?: readonly string[] }[],
): number {
  return items.reduce((score, item) => {
    const accepted = item.accepted ?? [item.answer];
    return score + (accepted.some((answer) => normalizeSecondaryAnswer(answer) === normalizeSecondaryAnswer(answers[item.id] ?? "")) ? 1 : 0);
  }, 0);
}

export function sequenceAnswers(order: readonly string[]): Record<string, string> {
  return Object.fromEntries(order.map((eventId, index) => [eventId, String(index + 1)]));
}

export function sequenceFromAnswers(answers: Record<string, string>): string[] {
  const ids = SECONDARY_HOMEWORK_ONE.reading.events.map((event) => event.id);
  const ranked = ids
    .map((id) => ({ id, rank: Number(answers[id]) }))
    .filter((item) => Number.isInteger(item.rank) && item.rank >= 1 && item.rank <= ids.length)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.id);
  return new Set(ranked).size === ids.length ? ranked : ids;
}

export function scoreSequence(order: readonly string[]): number {
  return SECONDARY_HOMEWORK_ONE.reading.correctOrder.reduce(
    (score, eventId, index) => score + (order[index] === eventId ? 1 : 0),
    0,
  );
}

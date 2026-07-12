import "server-only";
import type { EnglishCraftCraftQuestion, EnglishCraftMcQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";
import { isAdjectiveDepositSpellCorrect } from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  GRADE56_ADJECTIVES_CRAFT_V1,
  GRADE56_ADJECTIVES_MC_V1,
} from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import {
  DEFAULT_LIVE_GAME_QUESTION_SET_ID,
  getLiveGameQuestionSetSummary,
  isLiveGameQuestionSetId,
  type LiveGameQuestionSetId,
} from "@/lib/live-game/modes/english-craft/question-sets-client";

type LiveGameQuestionSet = {
  id: LiveGameQuestionSetId;
  version: number;
  questions: EnglishCraftMcQuestion[];
  craftQuestion: EnglishCraftCraftQuestion;
};

const SETS: Record<LiveGameQuestionSetId, LiveGameQuestionSet> = {
  "grade56-adjectives": {
    id: "grade56-adjectives",
    version: 1,
    questions: GRADE56_ADJECTIVES_MC_V1,
    craftQuestion: GRADE56_ADJECTIVES_CRAFT_V1 as EnglishCraftCraftQuestion,
  },
  "daily-routines-a1": {
    id: "daily-routines-a1", version: 1,
    questions: [
      { id: "routine-wake", prompt: "What do you usually do first in the morning?", options: ["wake up", "go to bed", "eat dinner", "do homework"], correctAnswer: "wake up" },
      { id: "routine-dressed", prompt: "Choose the best sentence.", options: ["I get dressed before school.", "I get dressed the library.", "I dressed get school.", "I am get dressed."], correctAnswer: "I get dressed before school." },
      { id: "routine-breakfast", prompt: "Which activity means eating in the morning?", options: ["have breakfast", "have dinner", "go home", "take a shower"], correctAnswer: "have breakfast" },
      { id: "routine-homework", prompt: "After school, I ___ my homework.", options: ["do", "make", "play", "go"], correctAnswer: "do" },
      { id: "routine-usually", prompt: "Which word means 'on most days'?", options: ["usually", "never", "now", "yesterday"], correctAnswer: "usually" },
      { id: "routine-never", prompt: "Mina does not walk to school on any day. She ___ walks to school.", options: ["never", "always", "usually", "sometimes"], correctAnswer: "never" },
    ],
    craftQuestion: { id: "routine-craft", prompt: "Put the routine in order to build the bridge:", wordBank: ["I", "usually", "do my homework", "after school"], correctOrder: ["I", "usually", "do my homework", "after school"], slotCount: 4 },
  },
  "school-life-a1": {
    id: "school-life-a1", version: 1,
    questions: [
      { id: "school-library", prompt: "Where can you borrow a book?", options: ["library", "playground", "canteen", "office"], correctAnswer: "library" },
      { id: "school-subject", prompt: "Math, English and science are school ___.", options: ["subjects", "breaks", "rooms", "games"], correctAnswer: "subjects" },
      { id: "school-break", prompt: "When do students rest and talk between lessons?", options: ["break time", "homework", "assembly", "class time"], correctAnswer: "break time" },
      { id: "school-borrow", prompt: "If you borrow a pencil, what should you do later?", options: ["give it back", "throw it away", "hide it", "break it"], correctAnswer: "give it back" },
      { id: "school-study", prompt: "Choose the best sentence.", options: ["We study English at school.", "We school English study.", "We studies English.", "We study at English."], correctAnswer: "We study English at school." },
      { id: "school-homework", prompt: "The teacher gives work to complete at home. It is ___.", options: ["homework", "break time", "a subject", "a library"], correctAnswer: "homework" },
    ],
    craftQuestion: { id: "school-craft", prompt: "Put the school message in order to build the bridge:", wordBank: ["We", "study English", "in the classroom", "every day"], correctOrder: ["We", "study English", "in the classroom", "every day"], slotCount: 4 },
  },
  "describing-places-a1": {
    id: "describing-places-a1", version: 1,
    questions: [
      { id: "place-there-is", prompt: "Choose the correct sentence for one bridge.", options: ["There is a bridge.", "There are a bridge.", "There a bridge is.", "There bridge."], correctAnswer: "There is a bridge." },
      { id: "place-there-are", prompt: "Choose the correct sentence for three trees.", options: ["There are three trees.", "There is three trees.", "There three trees are.", "There are tree."], correctAnswer: "There are three trees." },
      { id: "place-next", prompt: "The tree is beside the workbench. It is ___ the workbench.", options: ["next to", "behind", "between", "under"], correctAnswer: "next to" },
      { id: "place-between", prompt: "The flag is in the middle of two trees. It is ___ the trees.", options: ["between", "behind", "next to", "on"], correctAnswer: "between" },
      { id: "place-behind", prompt: "The stump is at the back of the tree. It is ___ the tree.", options: ["behind", "in front of", "between", "on"], correctAnswer: "behind" },
      { id: "place-front", prompt: "The workbench is before the river. It is ___ the river.", options: ["in front of", "behind", "under", "between"], correctAnswer: "in front of" },
    ],
    craftQuestion: { id: "places-craft", prompt: "Put the map description in order to build the bridge:", wordBank: ["There is", "a workbench", "next to", "the river"], correctOrder: ["There is", "a workbench", "next to", "the river"], slotCount: 4 },
  },
};

export function resolveLiveGameQuestionSetId(value: unknown): LiveGameQuestionSetId {
  return isLiveGameQuestionSetId(value) ? value : DEFAULT_LIVE_GAME_QUESTION_SET_ID;
}

export function getLiveGameQuestionSet(id: LiveGameQuestionSetId): LiveGameQuestionSet {
  return SETS[id];
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return hash;
}

export function pickQuestionFromSet(id: LiveGameQuestionSetId, seed: string): EnglishCraftMcQuestion {
  const set = SETS[id];
  return set.questions[hashSeed(seed) % set.questions.length]!;
}

export function getQuestionFromSet(id: LiveGameQuestionSetId, questionId: string): EnglishCraftMcQuestion | null {
  return SETS[id].questions.find((question) => question.id === questionId) ?? null;
}

export function isQuestionSetAnswerCorrect(id: LiveGameQuestionSetId, questionId: string, answer: string): boolean {
  const question = getQuestionFromSet(id, questionId);
  return question?.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
}

export function getCraftQuestionFromSet(id: LiveGameQuestionSetId): EnglishCraftCraftQuestion {
  return SETS[id].craftQuestion;
}

export function isQuestionSetCraftAnswerCorrect(id: LiveGameQuestionSetId, questionId: string, order: readonly string[]): boolean {
  const question = getCraftQuestionFromSet(id);
  return question.id === questionId && order.length === question.correctOrder.length &&
    order.every((word, index) => word === question.correctOrder[index]);
}

export function isQuestionSetDepositSpellCorrect(
  id: LiveGameQuestionSetId,
  questionId: string,
  spelling: string,
): boolean {
  const question = getQuestionFromSet(id, questionId);
  if (!question) return false;
  return isAdjectiveDepositSpellCorrect(question, spelling);
}

export function getQuestionSetSpellMetadata(
  id: LiveGameQuestionSetId,
  questionId: string,
): { spellHint: string; targetWord: string } | null {
  const question = getQuestionFromSet(id, questionId);
  if (!question || !("targetWord" in question) || !("spellHint" in question)) return null;
  const spellHint = String(question.spellHint ?? "").trim();
  const targetWord = String(question.targetWord ?? "").trim();
  if (!spellHint || !targetWord) return null;
  return { spellHint, targetWord };
}

export function getQuestionSetVersion(id: LiveGameQuestionSetId): number {
  return getLiveGameQuestionSetSummary(id).version;
}

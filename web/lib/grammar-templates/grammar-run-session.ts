import type { GrammarDifficulty } from "@/lib/grammar-builder/schema";



export type GrammarRunSession = {

  startedAtMs: number;

  quizCorrectCount: number;

  quizGradedCount: number;

};



export type GrammarRunStats = {

  elapsedMs: number;

  slug: string;

  difficulty?: GrammarDifficulty;

  quizCorrectCount: number;

  quizGradedCount: number;

};



export type GrammarRewardBreakdown = {

  baseGold: number;

  timeBonusGold: number;

  quizBonusGold: number;

  totalGold: number;

  experienceDelta: number;

};



const MIN_READ_MS_FOR_TIME_BONUS = 30_000;

const MAX_QUIZ_BONUS_GOLD = 3;



export function createGrammarRunSession(nowMs = Date.now()): GrammarRunSession {

  return { startedAtMs: nowMs, quizCorrectCount: 0, quizGradedCount: 0 };

}



export function recordGrammarQuizResult(session: GrammarRunSession, correct: boolean): void {

  session.quizGradedCount += 1;

  if (correct) session.quizCorrectCount += 1;

}



export function buildGrammarRunStats(

  session: GrammarRunSession,

  slug: string,

  difficulty?: GrammarDifficulty,

  endedAtMs = Date.now(),

): GrammarRunStats {

  return {

    elapsedMs: Math.max(0, endedAtMs - session.startedAtMs),

    slug,

    difficulty,

    quizCorrectCount: session.quizCorrectCount,

    quizGradedCount: session.quizGradedCount,

  };

}



export function computeGrammarPosterRewards(stats: GrammarRunStats): GrammarRewardBreakdown {

  const isA2 = stats.difficulty === "A2" || stats.difficulty === "B1";

  const baseGold = isA2 ? 8 : 5;

  const timeBonusGold =

    stats.elapsedMs >= MIN_READ_MS_FOR_TIME_BONUS ? (isA2 ? 2 : 1) : 0;

  const quizBonusGold =

    stats.quizGradedCount > 0 ?

      Math.min(stats.quizCorrectCount, MAX_QUIZ_BONUS_GOLD)

    : 0;

  const totalGold = baseGold + timeBonusGold + quizBonusGold;

  const experienceDelta = isA2 ? 15 : 10;



  return {

    baseGold,

    timeBonusGold,

    quizBonusGold,

    totalGold,

    experienceDelta,

  };

}



export function grammarCompletionEventId(lessonId: string, seed: string): string {

  const completionSeed = seed.trim() || lessonId;

  return `${lessonId}:${completionSeed}:complete`;

}


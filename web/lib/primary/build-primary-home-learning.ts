import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import { recommendVocabularyPracticeWords } from "@/lib/mastery/recommendations";
import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { getPlayerLevel } from "@/lib/progress/rewards";
import {
  ensureDailyQuestDay,
  getQuestTarget,
} from "@/lib/teststartpage/daily-quests";
import {
  buildVocabularyPracticeContext,
  getVocabularySet,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import { DEFAULT_PRACTICE_COUNT } from "@/lib/vocabulary-templates/types";
import {
  pickContinueVocabTarget,
  vocabLessonId,
  vocabPhaseFromResumeIndex,
  VOCAB_PHASE_LABELS,
} from "@/lib/primary/vocab-continue";

export type PrimaryPathStepStatus = "complete" | "current" | "available" | "locked";

export type PrimaryHomeLearningModel = {
  continueSetId: VocabSetId;
  resumeScreenIndex: number;
  today: {
    topicTitle: string;
    goal: string;
    skill: string;
    activitiesDone: number;
    activitiesTotal: number;
    nextActivityLabel: string;
  };
  path: Array<{
    id: string;
    title: string;
    description: string;
    status: PrimaryPathStepStatus;
  }>;
  recommended: Array<{
    id: string;
    title: string;
    icon: "match" | "cloze" | "listen";
    rewardLabel: string;
  }>;
  words: Array<{
    id: string;
    word: string;
    icon: string;
  }>;
  encouragement?: string;
};

function synthesizeGoal(setId: VocabSetId, wordCount: number): string {
  const n = Math.min(6, Math.max(1, wordCount));
  switch (setId) {
    case "breakfast_food":
    case "food_fruit":
    case "food_meals":
    case "food_snacks":
      return `I can name ${n} foods`;
    case "wild_animals":
    case "pets":
    case "sea_animals":
    case "farm_animals":
      return `I can name ${n} animals`;
    case "clothes_everyday":
      return `I can name ${n} clothes`;
    case "weather_words":
      return `I can talk about the weather`;
    case "school_supplies":
    case "school_activities":
      return `I can name ${n} school words`;
    case "body_head_face":
    case "body_limbs_inside":
      return `I can name ${n} body parts`;
    case "jobs_community":
    case "jobs_creative":
      return `I can name ${n} jobs`;
    case "toys_everyday":
      return `I can name ${n} toys`;
    default:
      return `I can learn ${n} new words`;
  }
}

function buildPathStatuses(args: {
  phase: number;
  setCompleted: boolean;
  hasReviewWords: boolean;
  vocabQuestDone: boolean;
}): PrimaryHomeLearningModel["path"] {
  const { phase, setCompleted, hasReviewWords, vocabQuestDone } = args;

  const learnStatus: PrimaryPathStepStatus = setCompleted || phase > 0 ? "complete" : "current";
  const practiceStatus: PrimaryPathStepStatus =
    setCompleted || phase > 2 ? "complete"
    : phase >= 1 ? "current"
    : "available";
  const reviewStatus: PrimaryPathStepStatus =
    setCompleted && hasReviewWords ? "current"
    : setCompleted || phase >= 3 ? "available"
    : hasReviewWords ? "available"
    : "locked";
  const rewardsStatus: PrimaryPathStepStatus =
    vocabQuestDone ? "complete"
    : setCompleted || phase >= 4 ? "available"
    : "locked";

  // Ensure exactly one current when possible
  let path: PrimaryHomeLearningModel["path"] = [
    {
      id: "learn",
      title: "Flashcards",
      description: "See and hear new words.",
      status: learnStatus,
    },
    {
      id: "practice",
      title: "Practice",
      description: "Spell, match, and choose.",
      status: practiceStatus,
    },
    {
      id: "review",
      title: "Review",
      description: "Listen and check what you remember.",
      status: reviewStatus,
    },
    {
      id: "rewards",
      title: "Earn Rewards",
      description: "Get gold and unlock prizes!",
      status: rewardsStatus,
    },
  ];

  const currentCount = path.filter((s) => s.status === "current").length;
  if (currentCount === 0) {
    const firstOpen = path.find((s) => s.status === "available");
    if (firstOpen) {
      path = path.map((s) =>
        s.id === firstOpen.id ? { ...s, status: "current" } : s,
      );
    }
  } else if (currentCount > 1) {
    let seen = false;
    path = path.map((s) => {
      if (s.status !== "current") return s;
      if (!seen) {
        seen = true;
        return s;
      }
      return { ...s, status: "available" as const };
    });
  }

  return path;
}

/** Home tab learning blocks from live progress / mastery / daily quests. */
export function buildPrimaryHomeLearningModel(
  playerLevel = getPlayerLevel(),
): PrimaryHomeLearningModel {
  const continueTarget = pickContinueVocabTarget(playerLevel);
  const setId = continueTarget.setId;
  const def = getVocabularySet(setId);
  const lessonId = vocabLessonId(setId);
  const snapshot = getProgressSnapshot();
  const setCompleted = snapshot.completedLessonIds.includes(lessonId);
  const resumeScreenIndex = setCompleted ? 0 : continueTarget.resumeScreenIndex;
  const phase = setCompleted
    ? 4
    : vocabPhaseFromResumeIndex(resumeScreenIndex);
  const activitiesTotal = VOCAB_PHASE_LABELS.length;
  const activitiesDone = setCompleted ? activitiesTotal : phase;

  const mastery = readMasterySnapshot();
  const recommendations = recommendVocabularyPracticeWords({
    words: def.words,
    mastery,
    limit: 6,
  });
  const practiceWords =
    recommendations.length > 0
      ? recommendations
          .map((rec) => def.words.find((w) => w.id === rec.wordId))
          .filter((w): w is (typeof def.words)[number] => Boolean(w))
      : buildVocabularyPracticeContext(def, {
          practiceCount: Math.min(6, def.words.length),
        }).practiceWords;

  const day = ensureDailyQuestDay();
  const vocabQuestTarget = getQuestTarget("vocab_set_completions");
  const vocabQuestProgress = day.progress.vocab_set_completions ?? 0;
  const vocabQuestDone = vocabQuestProgress >= vocabQuestTarget;

  const nextActivityLabel = setCompleted
    ? "Play again or pick a new topic"
    : VOCAB_PHASE_LABELS[phase];

  return {
    continueSetId: setId,
    resumeScreenIndex,
    today: {
      topicTitle: def.title,
      goal: synthesizeGoal(setId, def.words.length),
      skill: "Vocabulary",
      activitiesDone,
      activitiesTotal,
      nextActivityLabel,
    },
    path: buildPathStatuses({
      phase,
      setCompleted,
      hasReviewWords: recommendations.length > 0,
      vocabQuestDone,
    }),
    recommended: [
      {
        id: "match",
        title: "Match Pictures",
        icon: "match",
        rewardLabel: "+ gold & XP",
      },
      {
        id: "cloze",
        title: "Choose the Word",
        icon: "cloze",
        rewardLabel: "+ gold & XP",
      },
      {
        id: "listen",
        title: "Listen and Choose",
        icon: "listen",
        rewardLabel: "+ gold & XP",
      },
    ],
    words: practiceWords.slice(0, 6).map((w) => ({
      id: w.id,
      word: w.lemma,
      icon: w.imageUrl,
    })),
    encouragement: vocabQuestDone
      ? "Great work — today's vocabulary quest is done!"
      : `Finish ${Math.max(0, vocabQuestTarget - vocabQuestProgress)} more set${
          vocabQuestTarget - vocabQuestProgress === 1 ? "" : "s"
        } for today's quest.`,
  };
}

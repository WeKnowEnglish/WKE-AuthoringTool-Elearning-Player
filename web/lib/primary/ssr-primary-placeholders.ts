import { COLLECTION_BADGE_REGISTRY } from "@/lib/collection-badges";
import type { PrimaryHomeLearningModel } from "@/lib/primary/build-primary-home-learning";
import type { PrimaryEconomyFields } from "@/lib/primary/build-primary-home-model";
import type { PrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";
import type { PrimaryReviewModel } from "@/lib/primary/build-primary-review-model";
import { listVocabSetsInMenuOrder } from "@/lib/primary/vocab-continue";
import { XP_CURVE_BASE } from "@/lib/progress/leveling";

/**
 * Static dashboard models for SSR + the first client render.
 * Must not read localStorage (or any client-only source) so hydration matches.
 */
export const PRIMARY_SSR_ECONOMY: PrimaryEconomyFields = {
  studentName: "Student",
  avatarInitials: "S",
  level: 1,
  levelProgress: 0,
  gold: 0,
};

export const PRIMARY_SSR_LEARNING: PrimaryHomeLearningModel = {
  continueSetId: "breakfast_food",
  resumeScreenIndex: 0,
  today: {
    topicTitle: "Vocabulary",
    goal: "I can learn new words",
    skill: "Vocabulary",
    activitiesDone: 0,
    activitiesTotal: 5,
    nextActivityLabel: "Learn words",
  },
  path: [
    {
      id: "learn",
      title: "Learn Words",
      description: "See and hear new words.",
      status: "current",
    },
    {
      id: "practice",
      title: "Practice",
      description: "Match, choose, and spell.",
      status: "available",
    },
    {
      id: "review",
      title: "Review",
      description: "Check what you remember.",
      status: "locked",
    },
    {
      id: "rewards",
      title: "Earn Rewards",
      description: "Get gold and unlock prizes!",
      status: "locked",
    },
  ],
  recommended: [
    {
      id: "match",
      title: "Match the Word",
      icon: "match",
      rewardLabel: "+ gold & XP",
    },
    {
      id: "cloze",
      title: "Fill in the Blanks",
      icon: "cloze",
      rewardLabel: "+ gold & XP",
    },
    {
      id: "listen",
      title: "Spell the Word",
      icon: "listen",
      rewardLabel: "+ gold & XP",
    },
  ],
  words: [],
  encouragement: "Keep learning — gold and XP unlock new topics!",
};

export const PRIMARY_SSR_PROGRESS: PrimaryProgressModel = {
  level: 1,
  gold: 0,
  experience: 0,
  xpCurrent: 0,
  xpRequired: XP_CURVE_BASE,
  levelProgress: 0,
  mastery: { mastered: 0, learning: 0, total: 0 },
  vocabSets: {
    completed: 0,
    total: listVocabSetsInMenuOrder().length,
  },
  stickers: 0,
  collectedWords: 0,
  exploration: { percent: 0, discovered: 0, total: 0 },
  badges: COLLECTION_BADGE_REGISTRY.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    earned: false,
  })),
};

export const PRIMARY_SSR_REVIEW: PrimaryReviewModel = {
  items: [],
  dueCount: 0,
  fragileCount: 0,
};

export const PRIMARY_SSR_HOME_MODEL = {
  ...PRIMARY_SSR_ECONOMY,
  ...PRIMARY_SSR_LEARNING,
};

import type { LearningStrandId } from "@/lib/learning-strands";

export const LEARNING_LOOP_PHASES = [
  "STORY",
  "PRESENTATION",
  "EXPLORER",
  "REFLECTION",
  "COMPLETE",
] as const;

export type LearningLoopPhase = (typeof LEARNING_LOOP_PHASES)[number];

export type LearningLoopCompletionMode = "time" | "task" | "either";

export type PetCareRewardPayload = {
  coins?: number;
  supplyIds?: string[];
  mysteryBoxCount?: number;
};

export type LearningLoopPhaseConfig = {
  phase: Exclude<LearningLoopPhase, "COMPLETE">;
  label: string;
  targetDurationSec: number;
  strandIds: LearningStrandId[];
  completionMode: LearningLoopCompletionMode;
  minEvidenceRequired?: number;
};

export type LearningLoopConfig = {
  loopId: string;
  title: string;
  phases: LearningLoopPhaseConfig[];
  petCareReward?: PetCareRewardPayload;
};

export type LearningLoopPhaseEvent =
  | {
      type: "learning_loop_phase_started";
      loopId: string;
      sessionId: string;
      phase: LearningLoopPhase;
      phaseStartedAt: string;
      strandIds: LearningStrandId[];
      targetDurationSec: number;
    }
  | {
      type: "learning_loop_phase_completed";
      loopId: string;
      sessionId: string;
      phase: LearningLoopPhase;
      phaseCompletedAt: string;
      elapsedMs: number;
      strandIds: LearningStrandId[];
      evidenceCount?: number;
      completionReason: "task" | "time" | "manual";
    }
  | {
      type: "learning_loop_completed";
      loopId: string;
      sessionId: string;
      completedAt: string;
      elapsedMs: number;
      petCareReward?: PetCareRewardPayload;
    };

export const DEFAULT_DAILY_LEARNING_LOOP_PHASES: LearningLoopPhaseConfig[] = [
  {
    phase: "STORY",
    label: "Hook",
    targetDurationSec: 60,
    strandIds: ["meaning_focused_input"],
    completionMode: "either",
  },
  {
    phase: "PRESENTATION",
    label: "Instruction",
    targetDurationSec: 5 * 60,
    strandIds: ["language_focused_learning"],
    completionMode: "task",
  },
  {
    phase: "EXPLORER",
    label: "Application",
    targetDurationSec: 10 * 60,
    strandIds: ["meaning_focused_output", "fluency_development"],
    completionMode: "task",
    minEvidenceRequired: 2,
  },
  {
    phase: "REFLECTION",
    label: "Reflection",
    targetDurationSec: 60,
    strandIds: ["language_focused_learning"],
    completionMode: "either",
    minEvidenceRequired: 1,
  },
];

export const DEFAULT_DAILY_LEARNING_LOOP_CONFIG: LearningLoopConfig = {
  loopId: "daily-core-loop",
  title: "Daily learning quest",
  phases: DEFAULT_DAILY_LEARNING_LOOP_PHASES,
  petCareReward: {
    coins: 20,
    mysteryBoxCount: 1,
  },
};

export function isLearningLoopPhase(value: string): value is LearningLoopPhase {
  return (LEARNING_LOOP_PHASES as readonly string[]).includes(value);
}

export function firstLearningLoopPhase(config: LearningLoopConfig): LearningLoopPhase {
  return config.phases[0]?.phase ?? "COMPLETE";
}

export function nextLearningLoopPhase(
  config: LearningLoopConfig,
  current: LearningLoopPhase,
): LearningLoopPhase {
  const currentIndex = config.phases.findIndex((phase) => phase.phase === current);
  if (currentIndex < 0) return firstLearningLoopPhase(config);
  return config.phases[currentIndex + 1]?.phase ?? "COMPLETE";
}

export function getLearningLoopPhaseConfig(
  config: LearningLoopConfig,
  phase: LearningLoopPhase,
): LearningLoopPhaseConfig | null {
  if (phase === "COMPLETE") return null;
  return config.phases.find((entry) => entry.phase === phase) ?? null;
}

export function createLearningLoopPhaseStartedEvent(input: {
  config: LearningLoopConfig;
  sessionId: string;
  phase: LearningLoopPhase;
  startedAt?: Date;
}): Extract<LearningLoopPhaseEvent, { type: "learning_loop_phase_started" }> {
  const phaseConfig = getLearningLoopPhaseConfig(input.config, input.phase);
  return {
    type: "learning_loop_phase_started",
    loopId: input.config.loopId,
    sessionId: input.sessionId,
    phase: input.phase,
    phaseStartedAt: (input.startedAt ?? new Date()).toISOString(),
    strandIds: phaseConfig?.strandIds ?? [],
    targetDurationSec: phaseConfig?.targetDurationSec ?? 0,
  };
}

export function createLearningLoopPhaseCompletedEvent(input: {
  config: LearningLoopConfig;
  sessionId: string;
  phase: LearningLoopPhase;
  elapsedMs: number;
  completionReason: "task" | "time" | "manual";
  evidenceCount?: number;
  completedAt?: Date;
}): Extract<LearningLoopPhaseEvent, { type: "learning_loop_phase_completed" }> {
  const phaseConfig = getLearningLoopPhaseConfig(input.config, input.phase);
  return {
    type: "learning_loop_phase_completed",
    loopId: input.config.loopId,
    sessionId: input.sessionId,
    phase: input.phase,
    phaseCompletedAt: (input.completedAt ?? new Date()).toISOString(),
    elapsedMs: Math.max(0, input.elapsedMs),
    strandIds: phaseConfig?.strandIds ?? [],
    evidenceCount: input.evidenceCount,
    completionReason: input.completionReason,
  };
}

export function createLearningLoopCompletedEvent(input: {
  config: LearningLoopConfig;
  sessionId: string;
  elapsedMs: number;
  completedAt?: Date;
}): Extract<LearningLoopPhaseEvent, { type: "learning_loop_completed" }> {
  return {
    type: "learning_loop_completed",
    loopId: input.config.loopId,
    sessionId: input.sessionId,
    completedAt: (input.completedAt ?? new Date()).toISOString(),
    elapsedMs: Math.max(0, input.elapsedMs),
    petCareReward: input.config.petCareReward,
  };
}


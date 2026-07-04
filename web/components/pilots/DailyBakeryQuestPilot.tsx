"use client";

import { useCallback, useMemo, useState } from "react";
import { BakeryExplorerPilotPhase } from "@/components/pilots/BakeryExplorerPilotPhase";
import { LearningLoopRouter } from "@/components/learning-loop/LearningLoopRouter";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  dailyBakeryScreensForPhase,
  dailyBakeryScreensToLessonRows,
  getDailyBakeryLessonPlan,
  DAILY_BAKERY_QUEST_ID,
} from "@/lib/golden-references/daily-bakery-quest";
import type { LearningLoopPhase } from "@/lib/learning-loop";
import {
  createStudentPracticeSessionId,
  recordStudentPracticeSessionEvent,
} from "@/lib/student-session";
import type { LearningLoopPhaseEvent } from "@/lib/learning-loop";

function phaseLabel(phase: LearningLoopPhase): string {
  const plan = getDailyBakeryLessonPlan();
  if (phase === "COMPLETE") return "Complete";
  return plan.learningLoop.phases.find((p) => p.phase === phase)?.label ?? phase;
}

type PhasePanelProps = {
  phase: LearningLoopPhase;
  sessionId: string;
  onComplete: (input?: { evidenceCount?: number }) => void;
};

function DailyBakeryPhasePanel({ phase, sessionId, onComplete }: PhasePanelProps) {
  const [screenGeneration, setScreenGeneration] = useState(0);
  const plan = getDailyBakeryLessonPlan();
  const phaseScreens = useMemo(
    () => dailyBakeryScreensForPhase(phase),
    [phase],
  );
  const lessonRows = useMemo(
    () => dailyBakeryScreensToLessonRows(phaseScreens),
    [phaseScreens],
  );

  if (phase === "EXPLORER") {
    return (
      <BakeryExplorerPilotPhase
        sessionSeed={sessionId}
        onComplete={onComplete}
      />
    );
  }

  if (lessonRows.length === 0) {
    return (
      <KidPanel>
        <p className="font-semibold text-kid-ink">No screens for this phase.</p>
        <KidButton type="button" className="mt-4" onClick={() => onComplete()}>
          Continue
        </KidButton>
      </KidPanel>
    );
  }

  return (
    <div className="space-y-4">
      <KidPanel className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">
          {phaseLabel(phase)}
        </p>
        <h2 className="text-xl font-extrabold text-kid-ink">{plan.learningLoop.title}</h2>
      </KidPanel>
      <LessonPlayer
        key={`${phase}-${screenGeneration}`}
        lessonId={`${DAILY_BAKERY_QUEST_ID}-${phase.toLowerCase()}`}
        lessonTitle={plan.storyFirstBlueprint.lesson_metadata.lesson_title}
        screens={lessonRows}
        mode="preview"
        immersiveLayout={phase === "STORY"}
        storyControlsPlacement={phase === "STORY" ? "stage-overlay" : "below"}
      />
      <div className="flex justify-center gap-3">
        <KidButton
          type="button"
          variant="secondary"
          onClick={() => setScreenGeneration((n) => n + 1)}
        >
          Replay phase
        </KidButton>
        <KidButton type="button" onClick={() => onComplete({ evidenceCount: lessonRows.length })}>
          Complete {phaseLabel(phase)}
        </KidButton>
      </div>
    </div>
  );
}

function DailyBakeryCompletePanel() {
  const reward = getDailyBakeryLessonPlan().learningLoop.petCareReward;
  return (
    <KidPanel className="mx-auto max-w-lg text-center">
      <h2 className="text-2xl font-extrabold text-kid-ink">Quest complete!</h2>
      <p className="mt-2 text-lg font-semibold text-kid-ink/90">
        You helped Mai save the bakery. Your pet earned rewards!
      </p>
      {reward ?
        <p className="mt-3 text-base font-bold text-kid-ink">
          +{reward.coins ?? 0} coins
          {reward.mysteryBoxCount ? ` · ${reward.mysteryBoxCount} mystery box` : ""}
        </p>
      : null}
    </KidPanel>
  );
}

export function DailyBakeryQuestPilot() {
  const plan = getDailyBakeryLessonPlan();
  const sessionId = useMemo(
    () => createStudentPracticeSessionId({ activityId: DAILY_BAKERY_QUEST_ID }),
    [],
  );

  const handleLoopEvent = useCallback(
    (event: LearningLoopPhaseEvent) => {
      recordStudentPracticeSessionEvent(event);
    },
    [],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <KidPanel>
        <h1 className="text-2xl font-extrabold text-kid-ink">Daily Bakery Quest (pilot)</h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/80">
          Golden reference learning loop — STORY → PRESENTATION → EXPLORER → REFLECTION
        </p>
      </KidPanel>
      <LearningLoopRouter
        sessionId={sessionId}
        config={plan.learningLoop}
        onEvent={handleLoopEvent}
        renderPhase={({ phase, onComplete }) => (
          <DailyBakeryPhasePanel
            phase={phase}
            sessionId={sessionId}
            onComplete={onComplete}
          />
        )}
        renderComplete={() => <DailyBakeryCompletePanel />}
      />
    </div>
  );
}

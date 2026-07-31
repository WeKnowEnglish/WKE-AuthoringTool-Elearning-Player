"use client";

import { useCallback, useEffect, useState } from "react";
import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { StudentHomeLanding } from "@/components/primary/StudentHomeLanding";
import { StudentClassMenu } from "@/components/student-hub/StudentClassMenu";
import { StudentClassSelectorOverlay } from "@/components/student-hub/StudentClassSelectorOverlay";
import { VocabularySetOverlay } from "@/components/teststartpage/VocabularySetOverlay";
import { PrimaryGrammarPosterOverlay } from "@/components/primary/PrimaryGrammarPosterOverlay";
import { playSfx } from "@/lib/audio/sfx";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import { completeStudyCareIfPending } from "@/lib/pet";
import { buildPrimaryHomeLearningModel } from "@/lib/primary/build-primary-home-learning";
import { buildPrimaryEconomyModel } from "@/lib/primary/build-primary-home-model";
import { buildPrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";
import { buildPrimaryReviewModel } from "@/lib/primary/build-primary-review-model";
import {
  PRIMARY_SSR_HOME_MODEL,
  PRIMARY_SSR_PROGRESS,
  PRIMARY_SSR_REVIEW,
} from "@/lib/primary/ssr-primary-placeholders";
import { resumeScreenIndexForSet } from "@/lib/primary/vocab-continue";
import { getPlayerLevel, getRewards } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { newSessionSeed } from "@/lib/student-hub/session-seed";
import { isVocabSetId, type VocabSetId } from "@/lib/vocabulary-templates";
import { markExplorationNode } from "@/lib/worlds/exploration";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

type Props = {
  studentKey: string;
  classMemberships: StudentClassMembership[];
  assignedHomework?: StudentHomeworkCard[];
  liveSessions?: StudentClassLiveSession[];
  initialNav?: string | null;
  /** Deep-link a vocab set to open on mount, e.g. `?set=breakfast_food`. */
  initialSetId?: string | null;
  /** Banner from redirects, e.g. `secondary_for_a2`. */
  initialMessage?: string | null;
};

export function PrimaryDashboardClient({
  studentKey,
  classMemberships,
  assignedHomework = [],
  liveSessions = [],
  initialNav,
  initialSetId,
  initialMessage,
}: Props) {
  const hydrated = useClientHydrated();
  const { muted } = useAudioMuted();
  const { displayName } = useStudentDisplayName();
  // SSR + first client paint must match — never read localStorage in initializers.
  const [homeModel, setHomeModel] = useState(() => ({ ...PRIMARY_SSR_HOME_MODEL }));
  const [progressModel, setProgressModel] = useState(() => ({
    ...PRIMARY_SSR_PROGRESS,
  }));
  const [reviewModel, setReviewModel] = useState(() => ({ ...PRIMARY_SSR_REVIEW }));
  const [classSelectorOpen, setClassSelectorOpen] = useState(false);

  const [vocabSetOpen, setVocabSetOpen] = useState(false);
  const [activeVocabSetId, setActiveVocabSetId] = useState<VocabSetId | null>(null);
  const [vocabSessionSeed, setVocabSessionSeed] = useState<string | null>(null);
  const [vocabResumeIndex, setVocabResumeIndex] = useState(0);
  const [initialSetConsumed, setInitialSetConsumed] = useState(false);
  const [grammarPosterSlug, setGrammarPosterSlug] = useState<string | null>(null);

  const refreshHomeModel = useCallback(() => {
    const rewards = getRewards();
    setHomeModel({
      ...buildPrimaryEconomyModel(displayName, rewards),
      ...buildPrimaryHomeLearningModel(),
    });
    setProgressModel(buildPrimaryProgressModel(rewards));
    setReviewModel(buildPrimaryReviewModel());
  }, [displayName]);

  useEffect(() => {
    if (!hydrated) return;
    refreshHomeModel();
  }, [hydrated, refreshHomeModel]);

  useEffect(() => {
    recordAppDiagnostic("student", "mark", "primary_hub_loaded", {
      classCount: classMemberships.length,
      homeworkCount: assignedHomework.length,
    });
  }, [assignedHomework.length, classMemberships.length]);

  const openVocabularySet = useCallback(
    (id: VocabSetId, opts?: { resumeScreenIndex?: number }) => {
      const unlockId = `vocab_set:${id}` as const;
      const level = getPlayerLevel();
      if (!isUnlockAvailable(unlockId, level)) {
        playSfx("wrong", muted);
        return;
      }
      playSfx("tap", muted);
      markExplorationNode({ kind: "vocab_set", setId: id });
      const resume =
        opts?.resumeScreenIndex ?? resumeScreenIndexForSet(id);
      setActiveVocabSetId(id);
      setVocabResumeIndex(resume);
      setVocabSessionSeed(newSessionSeed());
      setVocabSetOpen(true);
    },
    [muted],
  );

  useEffect(() => {
    if (!hydrated || initialSetConsumed || !initialSetId) return;
    if (!isVocabSetId(initialSetId)) {
      setInitialSetConsumed(true);
      return;
    }
    setInitialSetConsumed(true);
    openVocabularySet(initialSetId);
  }, [hydrated, initialSetConsumed, initialSetId, openVocabularySet]);

  const overlayOpen = classSelectorOpen;

  const showSecondaryNotice =
    initialMessage === "secondary_for_a2" || initialMessage === "secondary_path_only";

  return (
    <>
      <LevelUpModal muted={muted} />

      {showSecondaryNotice ? (
        <div
          className="fixed left-1/2 top-3 z-50 w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-950 shadow-lg"
          role="status"
          aria-live="polite"
        >
          Secondary vocabulary practice is for the Secondary path. Keep learning on your
          primary dashboard.
        </div>
      ) : null}

      <StudentClassSelectorOverlay
        open={overlayOpen}
        onClose={() => {
          setClassSelectorOpen(false);
        }}
        memberships={classMemberships}
      />

      <StudentHomeLanding
        studentKey={studentKey}
        guideEnabled={!overlayOpen && !vocabSetOpen && !grammarPosterSlug}
        model={homeModel}
        progressModel={progressModel}
        reviewModel={reviewModel}
        assignedHomework={assignedHomework}
        liveSessions={liveSessions}
        enrolledInClass={classMemberships.length > 0}
        classMemberships={classMemberships}
        onOpenClassSelector={() => setClassSelectorOpen(true)}
        initialNav={initialSetId ? "vocabulary" : initialNav}
        onEconomyChange={refreshHomeModel}
        onOpenVocabularySet={(id) => {
          const resume =
            id === homeModel.continueSetId
              ? (homeModel.resumeScreenIndex ?? resumeScreenIndexForSet(id))
              : resumeScreenIndexForSet(id);
          openVocabularySet(id, { resumeScreenIndex: resume });
        }}
        onOpenGrammarPoster={(slug) => {
          playSfx("tap", muted);
          setGrammarPosterSlug(slug);
        }}
        headerExtra={
          <StudentClassMenu
            memberships={classMemberships}
            onOpenClassSelector={() => setClassSelectorOpen(true)}
            className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-2.5 py-1.5 text-xs font-extrabold text-[var(--pl-ink)]"
          />
        }
      />

      {vocabSetOpen && activeVocabSetId && vocabSessionSeed ? (
        <VocabularySetOverlay
          setId={activeVocabSetId}
          sessionSeed={vocabSessionSeed}
          muted={muted}
          initialScreenIndex={vocabResumeIndex}
          onEconomyChange={refreshHomeModel}
          onRequestNewRun={() => {
            setVocabResumeIndex(0);
            setVocabSessionSeed(newSessionSeed());
          }}
          onActivityComplete={() => {
            if (activeVocabSetId) {
              markExplorationNode({ kind: "vocab_set", setId: activeVocabSetId });
            }
            if (completeStudyCareIfPending()) {
              playSfx("correct", muted);
            }
            refreshHomeModel();
          }}
          onClose={() => {
            playSfx("tap", muted);
            setVocabSetOpen(false);
            setActiveVocabSetId(null);
            setVocabSessionSeed(null);
            setVocabResumeIndex(0);
            refreshHomeModel();
          }}
        />
      ) : null}

      {grammarPosterSlug ? (
        <PrimaryGrammarPosterOverlay
          slug={grammarPosterSlug}
          muted={muted}
          onClose={() => {
            playSfx("tap", muted);
            setGrammarPosterSlug(null);
          }}
        />
      ) : null}
    </>
  );
}

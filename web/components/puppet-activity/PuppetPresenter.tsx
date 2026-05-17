"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { TrueFalseView } from "@/components/lesson/interactions/TrueFalseView";
import { playSfx } from "@/lib/audio/sfx";
import { speakTextAndWait, stopSpeaking } from "@/lib/audio/tts";
import { resolveCaptionLayout, type PuppetCaptionLayout } from "@/lib/puppet-activity/caption-layout";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { getPuppet } from "@/lib/puppet-activity/registry";
import type { PartMotionTune } from "@/lib/puppet-activity/part-motion-tune";
import type { SkeletonBoneNode } from "@/lib/puppet-activity/puppet-skeleton";
import type { PuppetStageLayout } from "@/lib/puppet-activity/stage-layout";
import { stageLayoutTransform } from "@/lib/puppet-activity/stage-layout";
import type {
  PuppetAnimationId,
  PuppetPartKey,
  PuppetRigPivots,
  PuppetScript,
} from "@/lib/puppet-activity/types";
import { tokenizeLineForReveal } from "@/lib/puppet-activity/types";
import { buildPresenterSteps } from "@/lib/puppet-activity/validate";
import { PuppetSceneCaption } from "./PuppetSceneCaption";
import { PuppetStage } from "./PuppetStage";

type Phase = "line" | "quiz" | "done";

type Props = {
  script: PuppetScript;
  muted: boolean;
  motionEnabled: boolean;
  pivotOverrides?: PuppetRigPivots;
  partMotionTunes?: Partial<Record<PuppetPartKey, PartMotionTune>>;
  rigEditorOpen?: boolean;
  rigToolsPart?: PuppetPartKey | null;
  skeletonRoot?: SkeletonBoneNode;
  previewGesture?: PuppetAnimationId;
  previewGestureGeneration?: number;
  stageLayout?: PuppetStageLayout;
  captionLayoutOverrides?: Partial<Record<number, PuppetCaptionLayout>>;
  onActiveLineBeatIndexChange?: (beatIndex: number | null) => void;
  onClose: () => void;
};

export function PuppetPresenter({
  script,
  muted,
  motionEnabled,
  pivotOverrides,
  partMotionTunes,
  rigEditorOpen = false,
  rigToolsPart = null,
  skeletonRoot,
  previewGesture,
  previewGestureGeneration = 0,
  stageLayout,
  captionLayoutOverrides,
  onActiveLineBeatIndexChange,
  onClose,
}: Props) {
  const puppet = getPuppet(script.puppetId);
  const steps = useMemo(() => buildPresenterSteps(script), [script]);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("line");
  const [waitingTap, setWaitingTap] = useState(false);
  const [revealKeys, setRevealKeys] = useState<Record<number, number>>({});
  const [oneShotAnim, setOneShotAnim] = useState<PuppetAnimationId>("idle");
  const [interactionPass, setInteractionPass] = useState(false);
  const lineRunRef = useRef(0);

  const currentStep = steps[stepIndex];
  const ttsLang = script.ttsLang ?? "en-US";

  const visibleLineSteps = useMemo(() => {
    if (phase === "quiz" || phase === "done") {
      return steps.filter((s) => s.type === "line");
    }
    return steps.slice(0, stepIndex + 1).filter((s) => s.type === "line");
  }, [phase, stepIndex, steps]);

  const activeLineBeatIndex =
    currentStep?.type === "line" ? currentStep.beatIndex : null;

  useEffect(() => {
    onActiveLineBeatIndexChange?.(activeLineBeatIndex);
  }, [activeLineBeatIndex, onActiveLineBeatIndexChange]);

  const quizPayload = useMemo((): Extract<
    ScreenPayload,
    { type: "interaction"; subtype: "true_false" }
  > | null => {
    if (currentStep?.type !== "quiz") return null;
    const b = currentStep.beat;
    return {
      type: "interaction",
      subtype: "true_false",
      statement: b.statement,
      correct: b.correct,
      image_url: b.imageUrl,
      image_fit: "contain",
    };
  }, [currentStep]);

  useEffect(() => {
    if (!currentStep || currentStep.type !== "line") {
      return;
    }
    const runId = ++lineRunRef.current;
    const beat = currentStep.beat;
    const beatIndex = currentStep.beatIndex;
    setPhase("line");
    setWaitingTap(false);
    setOneShotAnim(beat.puppetAnimation ?? "idle");
    setRevealKeys((prev) => ({
      ...prev,
      [beatIndex]: (prev[beatIndex] ?? 0) + 1,
    }));

    const ac = new AbortController();
    void (async () => {
      const tokens = tokenizeLineForReveal(beat.text);
      const staggerMs = beat.wordStaggerMs ?? 140;
      const revealMs = Math.max(400, tokens.length * staggerMs + 200);
      const ttsPromise = speakTextAndWait(beat.text, {
        lang: ttsLang,
        muted,
        signal: ac.signal,
      });
      await Promise.all([
        new Promise((r) => window.setTimeout(r, revealMs)),
        ttsPromise,
      ]);
      if (lineRunRef.current !== runId) return;
      setWaitingTap(true);
    })();

    return () => {
      ac.abort();
      stopSpeaking();
    };
  }, [stepIndex, currentStep, muted, ttsLang]);

  useEffect(() => {
    if (currentStep?.type === "quiz") {
      setPhase("quiz");
      setWaitingTap(false);
      setInteractionPass(false);
    }
  }, [stepIndex, currentStep?.type]);

  const advanceLine = useCallback(() => {
    playSfx("tap", muted);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }, [muted, stepIndex, steps.length]);

  const onQuizPass = useCallback(() => {
    playSfx("complete", muted);
    setInteractionPass(true);
    setPhase("done");
  }, [muted]);

  if (phase === "done") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-6 p-4">
        <KidPanel className="max-w-md text-center">
          <p className="text-2xl font-extrabold text-kid-ink">Great job!</p>
          <p className="mt-2 text-lg text-kid-ink/90">You finished {script.title}.</p>
          <KidButton type="button" className="mt-6" onClick={onClose}>
            Done
          </KidButton>
        </KidPanel>
      </div>
    );
  }

  if (phase === "quiz" && quizPayload) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {visibleLineSteps.map((step) => (
            <PuppetSceneCaption
              key={step.beatIndex}
              beatIndex={step.beatIndex}
              beat={step.beat}
              layout={resolveCaptionLayout(
                step.beat,
                script,
                step.beatIndex,
                captionLayoutOverrides,
              )}
              revealKey={revealKeys[step.beatIndex] ?? 0}
              animate={false}
              motionEnabled={motionEnabled}
            />
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <TrueFalseView
            parsed={quizPayload}
            muted={muted}
            passed={interactionPass}
            onPass={onQuizPass}
            onWrong={() => playSfx("wrong", muted)}
            onNext={() => {}}
            onBack={() => {}}
            showBack={false}
            ttsLang={ttsLang}
          />
        </div>
      </div>
    );
  }

  const latestLineBeatIndex =
    visibleLineSteps.length > 0 ?
      visibleLineSteps[visibleLineSteps.length - 1]!.beatIndex
    : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="origin-center"
            style={
              stageLayout ?
                { transform: stageLayoutTransform(stageLayout) }
              : undefined
            }
          >
            <PuppetStage
              puppet={puppet}
              oneShotAnimation={oneShotAnim}
              motionEnabled={motionEnabled}
              pivotOverrides={pivotOverrides}
              partMotionTunes={partMotionTunes}
              showPivotMarkers={rigEditorOpen}
              rigToolsOpen={rigEditorOpen}
              rigToolsPart={rigToolsPart}
              skeletonRoot={skeletonRoot}
              previewGesture={previewGesture}
              previewGestureGeneration={previewGestureGeneration}
            />
          </div>
        </div>

        {visibleLineSteps.map((step) => (
          <PuppetSceneCaption
            key={step.beatIndex}
            beatIndex={step.beatIndex}
            beat={step.beat}
            layout={resolveCaptionLayout(
              step.beat,
              script,
              step.beatIndex,
              captionLayoutOverrides,
            )}
            revealKey={revealKeys[step.beatIndex] ?? 0}
            animate={step.beatIndex === latestLineBeatIndex}
            motionEnabled={motionEnabled}
          />
        ))}
      </div>

      <div className="flex shrink-0 justify-center border-t-2 border-kid-ink/20 bg-[#f7bf4d]/80 px-4 py-3">
        <KidButton
          type="button"
          disabled={!waitingTap}
          onClick={advanceLine}
          className="min-w-[10rem]"
        >
          Continue
        </KidButton>
      </div>
    </div>
  );
}

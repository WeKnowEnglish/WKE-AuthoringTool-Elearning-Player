"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { TrueFalseView } from "@/components/lesson/interactions/TrueFalseView";
import { playSfx } from "@/lib/audio/sfx";
import {
  prepareSpeechSynthesis,
  speakTextAndWait,
  stopSpeaking,
  unlockSpeechSynthesis,
} from "@/lib/audio/tts";
import {
  resolveCaptionLayout,
  resolveCaptionLayoutFields,
  type PuppetCaptionLayout,
} from "@/lib/puppet-activity/caption-layout";
import { resolvePuppetFoodOptions } from "@/lib/puppet-activity/food-options";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { getPuppet } from "@/lib/puppet-activity/registry";
import type { PartMotionTune } from "@/lib/puppet-activity/part-motion-tune";
import type { SkeletonBoneNode } from "@/lib/puppet-activity/puppet-skeleton";
import {
  DEFAULT_CHOICE_VAR,
  interpolatePuppetScriptText,
  type PuppetScriptVars,
} from "@/lib/puppet-activity/script-vars";
import type { PuppetStageLayout } from "@/lib/puppet-activity/stage-layout";
import { stageLayoutTransform } from "@/lib/puppet-activity/stage-layout";
import type {
  PuppetAnimationId,
  PuppetLineBeat,
  PuppetPartKey,
  PuppetRigPivots,
  PuppetScript,
} from "@/lib/puppet-activity/types";
import { tokenizeLineForReveal } from "@/lib/puppet-activity/types";
import { computeVisibleLineSteps } from "@/lib/puppet-activity/visible-captions";
import { buildPresenterSteps } from "@/lib/puppet-activity/validate";
import { PuppetFoodChoicePanel } from "./PuppetFoodChoicePanel";
import { PuppetSceneCaption } from "./PuppetSceneCaption";
import { PuppetStage } from "./PuppetStage";

type Phase = "line" | "choice" | "quiz" | "done";

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

function resolveLineDisplayText(
  beat: PuppetLineBeat,
  script: PuppetScript,
  beatIndex: number,
  vars: PuppetScriptVars,
  captionOverrides?: Partial<Record<number, PuppetCaptionLayout>>,
): { text: string; layout: PuppetCaptionLayout } {
  const layout = resolveCaptionLayout(beat, script, beatIndex, captionOverrides);
  return {
    text: interpolatePuppetScriptText(beat.text, vars),
    layout,
  };
}

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
  const [scriptVars, setScriptVars] = useState<PuppetScriptVars>({});
  const scriptVarsRef = useRef<PuppetScriptVars>({});
  scriptVarsRef.current = scriptVars;
  const lineRunRef = useRef(0);

  const currentStep = steps[stepIndex];
  const ttsLang = script.ttsLang ?? "en-US";

  const visibleLineSteps = useMemo(
    () =>
      computeVisibleLineSteps(steps, stepIndex, phase, {
        maxVisibleLines: script.maxVisibleLines ?? 6,
      }),
    [phase, script.maxVisibleLines, stepIndex, steps],
  );

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
      statement: interpolatePuppetScriptText(b.statement, scriptVars),
      correct: b.correct,
      image_url: b.imageUrl,
      image_fit: "contain",
    };
  }, [currentStep, scriptVars]);

  useEffect(() => {
    if (!currentStep || currentStep.type !== "line") {
      return;
    }
    const runId = ++lineRunRef.current;
    const beat = currentStep.beat;
    const beatIndex = currentStep.beatIndex;
    const displayText = interpolatePuppetScriptText(beat.text, scriptVarsRef.current);
    setPhase("line");
    setWaitingTap(false);
    setOneShotAnim(beat.puppetAnimation ?? "idle");
    setRevealKeys((prev) => ({
      ...prev,
      [beatIndex]: (prev[beatIndex] ?? 0) + 1,
    }));

    prepareSpeechSynthesis();

    const ac = new AbortController();
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const tokens = tokenizeLineForReveal(displayText);
      const staggerMs = beat.wordStaggerMs ?? 140;
      const revealMs = Math.max(400, tokens.length * staggerMs + 200);

      safetyTimer = window.setTimeout(() => {
        if (lineRunRef.current === runId) {
          setWaitingTap(true);
        }
      }, revealMs + 400);

      if (!muted && displayText.trim()) {
        await Promise.all([
          new Promise((r) => window.setTimeout(r, revealMs)),
          speakTextAndWait(displayText, {
            lang: ttsLang,
            muted,
            signal: ac.signal,
          }),
        ]);
      } else {
        await new Promise((r) => window.setTimeout(r, revealMs));
      }

      if (lineRunRef.current === runId) {
        setWaitingTap(true);
      }
    })();

    return () => {
      ac.abort();
      if (safetyTimer !== undefined) {
        window.clearTimeout(safetyTimer);
      }
      stopSpeaking();
    };
  }, [stepIndex, currentStep?.type, currentStep?.beatIndex, muted, ttsLang]);

  useEffect(() => {
    if (currentStep?.type === "choice") {
      setPhase("choice");
      setWaitingTap(false);
      setOneShotAnim(currentStep.beat.puppetAnimation ?? "idle");
    }
  }, [stepIndex, currentStep]);

  useEffect(() => {
    if (currentStep?.type === "quiz") {
      setPhase("quiz");
      setWaitingTap(false);
      setInteractionPass(false);
    }
  }, [stepIndex, currentStep?.type]);

  const advanceStep = useCallback(() => {
    if (!muted) unlockSpeechSynthesis();
    playSfx("tap", muted);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }, [muted, stepIndex, steps.length]);

  const handleFoodPick = useCallback(
    (option: { id: string; label: string }) => {
      if (!muted) unlockSpeechSynthesis();
      if (currentStep?.type !== "choice") return;
      const varName = currentStep.beat.storeAs ?? DEFAULT_CHOICE_VAR;
      setScriptVars((prev) => ({
        ...prev,
        [varName]: option.label,
        [`${varName}Id`]: option.id,
      }));
      playSfx("complete", muted);
      if (stepIndex < steps.length - 1) {
        setStepIndex(stepIndex + 1);
      }
    },
    [currentStep, muted, stepIndex, steps.length],
  );

  const onQuizPass = useCallback(() => {
    playSfx("complete", muted);
    setInteractionPass(true);
    setPhase("done");
  }, [muted]);

  const sceneBody = (choiceOverlay: ReactNode) => (
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

      {visibleLineSteps.map((step) => {
        const { text, layout } = resolveLineDisplayText(
          step.beat,
          script,
          step.beatIndex,
          scriptVars,
          captionLayoutOverrides,
        );
        const isLatest =
          phase === "line" &&
          currentStep?.type === "line" &&
          step.beatIndex === currentStep.beatIndex;
        return (
          <PuppetSceneCaption
            key={step.beatIndex}
            beatIndex={step.beatIndex}
            beat={step.beat}
            displayText={text}
            layout={layout}
            revealKey={revealKeys[step.beatIndex] ?? 0}
            animate={isLatest}
            motionEnabled={motionEnabled}
          />
        );
      })}

      {choiceOverlay}
    </div>
  );

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
        {sceneBody(null)}
        <div className="min-h-0 max-h-[45%] shrink-0 overflow-y-auto border-t-2 border-kid-ink/20 bg-[#f7bf4d]/90 px-2 py-2">
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

  if (phase === "choice" && currentStep?.type === "choice") {
    const beat = currentStep.beat;
    const options = resolvePuppetFoodOptions(beat.foodIds);
    const layout = resolveCaptionLayoutFields(
      script,
      currentStep.beatIndex,
      beat.captionLayout,
      captionLayoutOverrides,
    );
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {sceneBody(
          <PuppetFoodChoicePanel
            prompt={beat.prompt}
            options={options}
            layout={layout}
            muted={muted}
            ttsLang={ttsLang}
            onPick={handleFoodPick}
          />,
        )}
        <div className="flex shrink-0 justify-center border-t-2 border-kid-ink/20 bg-[#f7bf4d]/80 px-4 py-3">
          <p className="text-sm font-bold text-kid-ink/80">Tap a food to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {sceneBody(null)}
      <div className="flex shrink-0 justify-center border-t-2 border-kid-ink/20 bg-[#f7bf4d]/80 px-4 py-3">
        <KidButton
          type="button"
          disabled={!waitingTap}
          onClick={advanceStep}
          className="min-w-[10rem]"
        >
          Continue
        </KidButton>
      </div>
    </div>
  );
}

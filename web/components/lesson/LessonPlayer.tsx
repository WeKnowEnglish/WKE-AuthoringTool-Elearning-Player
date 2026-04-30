"use client";

import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KidButton,
  kidLinkPrimaryClassName,
  kidLinkSecondaryClassName,
} from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import {
  InteractionFeedbackShell,
  type InteractionFeedbackKind,
} from "@/components/kid-ui/InteractionFeedbackShell";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { KidProgressBar } from "@/components/kid-ui/KidProgressBar";
import { KidStickerStrip } from "@/components/kid-ui/KidStickerStrip";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, stopSpeaking } from "@/lib/audio/tts";
import type { LessonScreenRow } from "@/lib/data/catalog";
import {
  getProgressSnapshot,
  getStickerCount,
  markLessonComplete,
  recordCorrectAnswer,
  setAvatarId,
  setResumeScreen,
} from "@/lib/progress/local-storage";
import { awardRewards, getRewards } from "@/lib/progress/rewards";
import { recordWordInteraction } from "@/lib/progress/word-performance";
import {
  essayPayloadSchema,
  fillBlanksPayloadSchema,
  fixTextPayloadSchema,
  mcQuizPayloadSchema,
  parseScreenPayload,
  shortAnswerPayloadSchema,
  startPayloadSchema,
  trueFalsePayloadSchema,
  type ScreenPayload,
} from "@/lib/lesson-schemas";
import {
  ClickTargetsView,
  DragMatchView,
  DragSentenceView,
  EssayView,
  FillBlanksView,
  FixTextView,
  GuidedDialogueView,
  HotspotGateView,
  HotspotInfoView,
  LetterMixupView,
  ListenHotspotSequenceView,
  ListenColorWriteView,
  McQuizView,
  PresentationInteractiveView,
  ShortAnswerView,
  SoundSortView,
  SortingGameView,
  TableCompleteView,
  TrueFalseView,
  VoiceQuestionView,
  WordShapeHuntView,
} from "@/components/lesson/interaction-views";
import { StoryBookView } from "@/components/lesson/StoryBookView";
import type { LessonPlayerVisualEdit } from "@/components/lesson/lesson-player-edit";

export type { LessonPlayerVisualEdit };

const AVATAR_OPTIONS = [
  { id: "fox", emoji: "🦊" },
  { id: "robot", emoji: "🤖" },
  { id: "star", emoji: "⭐" },
] as const;

function RewardScreen({
  lessonTitle,
  stickerCount,
  onPlayAgain,
  muted,
}: {
  lessonTitle: string;
  stickerCount: number;
  onPlayAgain: () => void;
  muted: boolean;
}) {
  const [avatar, setAvatar] = useState<string | null>(
    () => getProgressSnapshot().avatarId ?? null,
  );

  return (
    <div className="relative overflow-hidden rounded-xl">
      <KidConfetti active />
      <KidPanel className="relative text-center">
        <p className="text-3xl font-extrabold text-kid-ink">Great job!</p>
        {avatar ? (
          <p className="mt-4 text-8xl leading-none" aria-hidden>
            {AVATAR_OPTIONS.find((a) => a.id === avatar)?.emoji ?? "⭐"}
          </p>
        ) : null}
        <p className="mt-3 text-xl text-kid-ink">You finished {lessonTitle}!</p>
        <p className="mt-2 text-lg font-semibold text-kid-ink">
          {stickerCount > 0
            ? `You have ${stickerCount} sticker${stickerCount === 1 ? "" : "s"} in your book!`
            : "Keep going to earn stickers!"}
        </p>
        {!avatar ? (
          <div className="mt-6">
            <p className="mb-3 text-lg font-bold text-kid-ink">Pick a buddy</p>
            <div className="flex flex-wrap justify-center gap-3">
              {AVATAR_OPTIONS.map((a) => (
                <KidButton
                  key={a.id}
                  type="button"
                  variant="secondary"
                  className="!min-h-12 !min-w-12 text-4xl"
                  onClick={() => {
                    setAvatar(a.id);
                    setAvatarId(a.id);
                  }}
                >
                  <span aria-hidden>{a.emoji}</span>
                  <span className="sr-only">{a.id}</span>
                </KidButton>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <KidButton
            type="button"
            onClick={() => {
              playSfx("tap", muted);
              onPlayAgain();
            }}
          >
            Play again
          </KidButton>
          <Link href="/learn" className={kidLinkSecondaryClassName}>
            Finish
          </Link>
        </div>
      </KidPanel>
    </div>
  );
}

export type LessonPlayerMode = "student" | "preview";

type Props = {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
  /** Preview: no progress writes, different end screen */
  mode?: LessonPlayerMode;
  /** When set (e.g. teacher preview), open this screen index first */
  initialScreenIndex?: number;
  /** When mode is preview, show inline editors on the student layout */
  visualEdit?: LessonPlayerVisualEdit;
};

function useMuted() {
  return getProgressSnapshot().audioMuted === true;
}

export function LessonPlayer({
  lessonId,
  lessonTitle,
  screens,
  mode = "student",
  initialScreenIndex = 0,
  visualEdit,
}: Props) {
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, initialScreenIndex),
      Math.max(0, screens.length - 1),
    ),
  );
  const [done, setDone] = useState(false);
  const [interactionPass, setInteractionPass] = useState(false);
  const [dragFilled, setDragFilled] = useState<string[]>([]);
  const [interactionFeedback, setInteractionFeedback] =
    useState<InteractionFeedbackKind>("none");
  /** Start at 0 so SSR + first client paint match; getStickerCount() reads localStorage and differs on server vs client. */
  const [stickerCount, setStickerCount] = useState(0);
  const [gold, setGold] = useState(0);
  const [experience, setExperience] = useState(0);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceCompletedForScreenRef = useRef<string | null>(null);

  const muted = useMuted();
  const isPreview = mode === "preview";
  const canvasEdit = isPreview && visualEdit != null;

  useEffect(() => {
    if (isPreview) return;
    setStickerCount(getStickerCount());
    const rewards = getRewards();
    setGold(rewards.gold);
    setExperience(rewards.experience);
  }, [isPreview]);

  useEffect(() => {
    const max = Math.max(0, screens.length - 1);
    const next = Math.min(Math.max(0, initialScreenIndex), max);
    setIndex(next);
  }, [initialScreenIndex, screens.length]);

  const screen = screens[index];
  const parsed: ScreenPayload | null = screen
    ? parseScreenPayload(screen.screen_type, screen.payload)
    : null;

  useEffect(() => {
    stopSpeaking();
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    queueMicrotask(() => {
      setInteractionPass(false);
      setDragFilled([]);
      setInteractionFeedback("none");
    });
    if (!isPreview) {
      setResumeScreen(lessonId, index);
    }
  }, [index, lessonId, isPreview]);

  useEffect(
    () => () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    },
    [],
  );

  const goNext = useCallback(() => {
    if (index < screens.length - 1) {
      const next = index + 1;
      setIndex(next);
      visualEdit?.onScreenIndexChange?.(next);
    } else {
      if (!isPreview) {
        markLessonComplete(lessonId);
        playSfx("complete", muted);
        const snapshot = awardRewards({
          eventId: `${lessonId}:${Date.now()}`,
          goldDelta: 0,
          experienceDelta: 10,
        });
        setGold(snapshot.gold);
        setExperience(snapshot.experience);
      }
      setDone(true);
    }
  }, [index, screens.length, lessonId, muted, isPreview, visualEdit]);

  const goBack = useCallback(() => {
    if (index > 0) {
      const next = index - 1;
      setIndex(next);
      visualEdit?.onScreenIndexChange?.(next);
    }
  }, [index, visualEdit]);

  useEffect(() => {
    if (!interactionPass) {
      autoAdvanceCompletedForScreenRef.current = null;
    }
  }, [interactionPass]);

  useEffect(() => {
    if (!parsed) return;
    if (!screen) return;
    if (!interactionPass) return;
    if (parsed.type !== "interaction") return;
    if (parsed.auto_advance_on_pass !== true) return;
    const currentScreenId = screen.id;
    if (
      autoAdvanceCompletedForScreenRef.current &&
      autoAdvanceCompletedForScreenRef.current !== currentScreenId
    ) {
      return;
    }
    if (autoAdvanceCompletedForScreenRef.current === currentScreenId) return;
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = setTimeout(() => {
      // Guard against stale timer advancing a newer screen.
      if (screens[index]?.id !== currentScreenId) return;
      autoAdvanceCompletedForScreenRef.current = currentScreenId;
      goNext();
    }, 650);
  }, [interactionPass, parsed, goNext, screen, screens, index]);

  if (screens.length === 0 || !screen) {
    return (
      <KidPanel>
        <p className="text-lg">This lesson has no screens yet.</p>
        {!isPreview ? (
          <Link href="/learn" className="mt-4 inline-block font-semibold underline">
            Back to lessons
          </Link>
        ) : null}
      </KidPanel>
    );
  }

  if (!parsed) {
    return (
      <div className="space-y-6">
        {isPreview ? (
          <p className="rounded border-2 border-amber-600 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
            Preview — this screen’s data is invalid or uses an unsupported type.
          </p>
        ) : null}
        <KidPanel>
          <p className="text-lg font-semibold">This activity could not be loaded.</p>
          <p className="mt-2 text-sm text-neutral-600">
            Type: {screen.screen_type} · Check the lesson content in the teacher editor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {index > 0 ? (
              <KidButton type="button" variant="secondary" onClick={goBack}>
                Back
              </KidButton>
            ) : null}
            <KidButton type="button" onClick={goNext}>
              Skip
            </KidButton>
          </div>
        </KidPanel>
      </div>
    );
  }

  if (done) {
    if (isPreview) {
      if (lessonId.startsWith("activity-")) {
        return (
          <KidPanel className="space-y-4 text-center">
            <p className="text-2xl font-bold text-kid-ink">Congratulations!</p>
            <p className="mt-2 text-lg text-kid-ink">
              You completed <span className="font-semibold">{lessonTitle}</span>.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <KidButton
                type="button"
                onClick={() => {
                  playSfx("tap", muted);
                  setDone(false);
                  setIndex(0);
                  visualEdit?.onScreenIndexChange?.(0);
                }}
              >
                Play again
              </KidButton>
              <Link href="/teacher" className={kidLinkSecondaryClassName}>
                Back to dashboard
              </Link>
              <Link href="/teacher/courses" className={kidLinkSecondaryClassName}>
                Courses
              </Link>
              <Link href="/activities" className={kidLinkSecondaryClassName}>
                Activity library
              </Link>
            </div>
          </KidPanel>
        );
      }
      return (
        <KidPanel className="space-y-4 text-center">
          <p className="text-2xl font-bold text-kid-ink">End of preview</p>
          <p className="mt-2 text-lg text-kid-ink">This is how students finish {lessonTitle}.</p>
          <div>
            <KidButton
              type="button"
              onClick={() => {
                playSfx("tap", muted);
                setDone(false);
                setIndex(0);
                visualEdit?.onScreenIndexChange?.(0);
              }}
            >
              Restart preview
            </KidButton>
          </div>
        </KidPanel>
      );
    }
    return (
      <RewardScreen
        lessonTitle={lessonTitle}
        stickerCount={stickerCount}
        muted={muted}
        onPlayAgain={() => {
          setDone(false);
          setIndex(0);
          visualEdit?.onScreenIndexChange?.(0);
        }}
      />
    );
  }

  const nav = {
    muted,
    passed: interactionPass,
    onNext: goNext,
    onBack: goBack,
    showBack: index > 0,
  };

  const passHandlers = {
    onPass: () => {
      setInteractionFeedback("correct");
      window.setTimeout(() => setInteractionFeedback("none"), 750);
      setInteractionPass(true);
      playSfx("correct", muted);
      if (!isPreview) {
        const { stickers } = recordCorrectAnswer();
        setStickerCount(stickers);
        const perQuestionGold =
          typeof parsed.gold_reward_on_pass === "number" && Number.isFinite(parsed.gold_reward_on_pass) ?
            Math.max(0, parsed.gold_reward_on_pass)
          : 1;
        const rewardSnapshot = awardRewards({
          eventId: `${lessonId}:${screen.id}:pass`,
          goldDelta: perQuestionGold,
          experienceDelta: 0,
        });
        setGold(rewardSnapshot.gold);
        setExperience(rewardSnapshot.experience);
        const trackedWords = extractTrackedWords(parsed);
        recordWordInteraction(trackedWords, true);
      }
    },
    onWrong: () => {
      setInteractionFeedback("wrong");
      window.setTimeout(() => setInteractionFeedback("none"), 520);
      playSfx("wrong", muted);
      if (!isPreview) {
        const trackedWords = extractTrackedWords(parsed);
        recordWordInteraction(trackedWords, false);
      }
    },
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {isPreview ? (
        <p className="rounded border-2 border-sky-700 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950">
          Student preview — progress is not saved.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-kid-ink pb-3">
        <h1 className="text-xl font-bold text-kid-ink">{lessonTitle}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <KidStickerStrip count={stickerCount} />
          <p className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
            Gold: {gold}
          </p>
          <p className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900">
            XP: {experience}
          </p>
          <KidProgressBar currentIndex={index} total={screens.length} />
        </div>
      </div>

      {parsed.type === "start" && (
        <div className="space-y-6">
          {!canvasEdit ? (
            <div className="flex flex-wrap justify-center gap-3">
              <KidButton
                type="button"
                variant="accent"
                className="!min-h-12 !min-w-0 px-5"
                onClick={() => {
                  playSfx("tap", muted);
                  speakText(parsed.read_aloud_title ?? lessonTitle, { muted });
                }}
              >
                Hear title
              </KidButton>
            </div>
          ) : null}
          {parsed.image_url ? (
            <div
              className={clsx(
                "relative aspect-[16/10] w-full overflow-hidden rounded-lg border-4 border-kid-ink",
                canvasEdit && "ring-2 ring-sky-500 ring-offset-2",
              )}
              title={canvasEdit ? "Edit image URL in the panel →" : undefined}
            >
              <Image
                src={parsed.image_url}
                alt=""
                fill
                className={parsed.image_fit === "contain" ? "object-contain bg-white" : "object-cover"}
                sizes="(max-width:768px) 100vw, 42rem"
                priority
                unoptimized={parsed.image_url.includes("placehold.co")}
              />
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-4">
            {canvasEdit ? (
              <div className="flex w-full max-w-md flex-col gap-2">
                <label className="text-xs font-semibold text-kid-ink">
                  Title for read-aloud (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border-2 border-kid-ink px-2 py-1 text-base"
                    value={parsed.read_aloud_title ?? ""}
                    onChange={(e) => {
                      try {
                        const next = startPayloadSchema.parse({
                          type: "start",
                          image_url: parsed.image_url,
                          image_fit: parsed.image_fit ?? "cover",
                          cta_label: parsed.cta_label,
                          read_aloud_title: e.target.value || undefined,
                        });
                        visualEdit!.onPayloadChange(screen.id, next);
                      } catch {
                        /* ignore */
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  aria-label="Start button label"
                  className="min-h-14 min-w-[10rem] rounded-lg border-4 border-kid-ink bg-kid-cta px-6 py-3 text-center text-lg font-semibold text-kid-ink shadow-inner outline-none ring-sky-500 focus:ring-4"
                  value={parsed.cta_label ?? "Start learning"}
                  onChange={(e) => {
                    try {
                      const next = startPayloadSchema.parse({
                        type: "start",
                        image_url: parsed.image_url,
                          image_fit: parsed.image_fit ?? "cover",
                        cta_label: e.target.value,
                        read_aloud_title: parsed.read_aloud_title,
                      });
                      visualEdit!.onPayloadChange(screen.id, next);
                    } catch {
                      /* ignore partial */
                    }
                  }}
                />
              </div>
            ) : (
              <KidButton
                onClick={() => {
                  playSfx("tap", muted);
                  goNext();
                }}
              >
                {parsed.cta_label ?? "Start learning"}
              </KidButton>
            )}
          </div>
        </div>
      )}

      {parsed.type === "story" && (
        <StoryBookView
          key={screen.id}
          screenId={screen.id}
          payload={parsed}
          muted={muted}
          compactPreview={isPreview}
          canvasEdit={!!canvasEdit}
          visualEdit={visualEdit}
          lessonBackDisabled={index <= 0}
          onNextScreen={() => {
            playSfx("tap", muted);
            goNext();
          }}
          onBackScreen={() => {
            playSfx("tap", muted);
            goBack();
          }}
        />
      )}

      {parsed.type === "interaction" && parsed.subtype === "mc_quiz" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Question</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base font-semibold"
                rows={2}
                value={parsed.question}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      mcQuizPayloadSchema.parse({
                        ...parsed,
                        question: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <McQuizView parsed={parsed} {...nav} {...passHandlers} />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "true_false" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Statement</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.statement}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      trueFalsePayloadSchema.parse({
                        ...parsed,
                        statement: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <TrueFalseView parsed={parsed} {...nav} {...passHandlers} />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "short_answer" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Prompt</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={2}
                value={parsed.prompt}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      shortAnswerPayloadSchema.parse({
                        ...parsed,
                        prompt: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <ShortAnswerView parsed={parsed} {...nav} {...passHandlers} />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "fix_text" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Broken text</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.broken_text}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      fixTextPayloadSchema.parse({
                        ...parsed,
                        broken_text: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <FixTextView parsed={parsed} {...nav} {...passHandlers} />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "fill_blanks" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Template</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 font-mono text-sm"
                rows={2}
                value={parsed.template}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      fillBlanksPayloadSchema.parse({
                        ...parsed,
                        template: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <FillBlanksView key={screen.id} parsed={parsed} {...nav} {...passHandlers} />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "essay" && (
        <>
          {canvasEdit ? (
            <label className="mb-3 block rounded-lg border-2 border-dashed border-sky-600 bg-sky-50 px-3 py-2">
              <span className="text-xs font-bold text-sky-900">Prompt</span>
              <textarea
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-base"
                rows={3}
                value={parsed.prompt}
                onChange={(e) => {
                  try {
                    visualEdit!.onPayloadChange(
                      screen.id,
                      essayPayloadSchema.parse({
                        ...parsed,
                        prompt: e.target.value,
                      }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </label>
          ) : null}
          <InteractionFeedbackShell kind={interactionFeedback}>
            <EssayView
              parsed={parsed}
              muted={muted}
              passed={interactionPass}
              onPass={passHandlers.onPass}
              onNext={goNext}
              onBack={goBack}
              showBack={index > 0}
            />
          </InteractionFeedbackShell>
        </>
      )}
      {parsed.type === "interaction" && parsed.subtype === "hotspot_info" && (
        <InteractionFeedbackShell kind="none">
          <HotspotInfoView parsed={parsed} {...nav} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "hotspot_gate" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <HotspotGateView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "drag_match" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <DragMatchView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "click_targets" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <ClickTargetsView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "sound_sort" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <SoundSortView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "listen_hotspot_sequence" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <ListenHotspotSequenceView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "listen_color_write" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <ListenColorWriteView key={screen.id} parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "letter_mixup" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <LetterMixupView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "word_shape_hunt" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <WordShapeHuntView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "table_complete" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <TableCompleteView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "sorting_game" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <SortingGameView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "voice_question" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <VoiceQuestionView
            parsed={parsed}
            lessonId={lessonId}
            screenId={screen.id}
            {...nav}
            {...passHandlers}
          />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "guided_dialogue" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <GuidedDialogueView
            parsed={parsed}
            lessonId={lessonId}
            screenId={screen.id}
            {...nav}
            {...passHandlers}
          />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "presentation_interactive" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <PresentationInteractiveView parsed={parsed} {...nav} {...passHandlers} />
        </InteractionFeedbackShell>
      )}
      {parsed.type === "interaction" && parsed.subtype === "drag_sentence" && (
        <InteractionFeedbackShell kind={interactionFeedback}>
          <DragSentenceView
            parsed={parsed}
            muted={muted}
            filled={dragFilled}
            setFilled={setDragFilled}
            passed={interactionPass}
            {...passHandlers}
            onNext={goNext}
            onBack={goBack}
            showBack={index > 0}
          />
        </InteractionFeedbackShell>
      )}
    </div>
  );
}

function extractWords(text: string): string[] {
  const matches = text.match(/[A-Za-z']+/g) ?? [];
  return matches.map((w) => w.toLowerCase());
}

function uniqueWords(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 40);
}

function extractTrackedWords(payload: ScreenPayload): string[] {
  if (payload.type !== "interaction") return [];
  switch (payload.subtype) {
    case "mc_quiz":
      return uniqueWords(
        extractWords(payload.question).concat(payload.options.flatMap((option) => extractWords(option.label))),
      );
    case "true_false":
      return uniqueWords(extractWords(payload.statement));
    case "fill_blanks":
      return uniqueWords(
        extractWords(payload.template).concat((payload.word_bank ?? []).flatMap((word) => extractWords(word))),
      );
    case "fix_text":
      return uniqueWords(
        extractWords(payload.broken_text).concat(payload.acceptable.flatMap((option) => extractWords(option))),
      );
    case "drag_sentence":
      return uniqueWords(payload.word_bank.flatMap((word) => extractWords(word)));
    case "listen_hotspot_sequence":
      return uniqueWords(
        extractWords(payload.body_text ?? "").concat(payload.targets.flatMap((target) => extractWords(target.label))),
      );
    default:
      return [];
  }
}

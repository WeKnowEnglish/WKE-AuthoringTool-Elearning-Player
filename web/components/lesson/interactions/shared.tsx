"use client";

import Image from "next/image";
import { clsx } from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { uploadStudentVoiceSubmission } from "@/lib/actions/student-voice";
import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";
import { VOCAB_STAGE_BACKGROUND } from "@/lib/vocabulary-templates/vocab-interaction-ui";
import { KidPanel } from "@/components/kid-ui/KidPanel";

export type InteractionImageDisplayOptions = {
  /**
   * Vocabulary overlay: blue frame + multiply blend so near-white library JPEG mats
   * show the stage color (same idea as transparent PNGs on the learn screen).
   */
  vocabStage?: boolean;
};

/** Student-facing image in a fixed frame: default show whole image (contain). */
export function interactionImageFitClass(
  imageFit: "cover" | "contain" | undefined,
  options?: InteractionImageDisplayOptions,
) {
  const isContain = (imageFit ?? "contain") === "contain";
  const fit = isContain ? "object-contain" : "object-cover";
  if (options?.vocabStage && isContain) {
    return clsx(fit, "mix-blend-multiply");
  }
  return isContain ? `${fit} bg-white` : fit;
}

/** Hero image frame behind {@link interactionImageFitClass} when using multiply knock-out. */
export function interactionHeroImageFrameClass(options?: InteractionImageDisplayOptions): string {
  return clsx(options?.vocabStage && "isolate");
}

export function interactionHeroImageFrameStyle(
  options?: InteractionImageDisplayOptions,
): CSSProperties | undefined {
  if (!options?.vocabStage) return undefined;
  return { backgroundColor: VOCAB_STAGE_BACKGROUND };
}

/**
 * Height for full-width hero images (MCQ, fill blanks, letter mix-up, …).
 * Uses the smaller of: a modest dvh cap, viewport minus typical quiz/lesson chrome + fixed nav,
 * and a 16∶9 width-based cap — reduces whole-page scroll on short screens.
 */
export const interactionHeroImageHeightStyle: CSSProperties = {
  height: "min(28dvh, calc(100dvh - 21rem), calc((100vw - 2.5rem) * 9 / 16))",
};

/** Min height for hero image inside vocab overlay flex stage (fill + flex-1). */
export const interactionImmersiveHeroMinStyle: CSSProperties = {
  minHeight: "min(32dvh, calc(100dvh - 26rem), calc((100vw - 2.5rem) * 9 / 16))",
};

/** Fills the lesson player stage column (vocabulary overlay interactions). */
export const interactionImmersiveStageClass =
  "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden pb-11";

export function GuideBlock({
  guide,
}: {
  guide?: { image_url?: string; tip_text?: string; image_fit?: "cover" | "contain" };
}) {
  if (!guide?.tip_text && !guide?.image_url) return null;
  return (
    <KidPanel className="mt-4 flex gap-3 border-kid-ink bg-kid-cta/25">
      {guide.image_url ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 border-kid-ink">
          <Image
            src={guide.image_url}
            alt="Guide"
            width={80}
            height={80}
            className={interactionImageFitClass(guide.image_fit)}
            unoptimized={guide.image_url.includes("placehold.co")}
          />
        </div>
      ) : null}
      <div className="flex-1">
        {guide.tip_text ? (
          <p className="text-base font-medium leading-relaxed text-kid-ink">{guide.tip_text}</p>
        ) : null}
      </div>
    </KidPanel>
  );
}

export function unopt(url: string) {
  return (
    url.includes("placehold.co") ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    /^https?:\/\//i.test(url)
  );
}

/** Brief scale pop on interaction hero images (correct answer feedback). */
export function pulseInteractionHero(
  el: HTMLElement | null,
  prefersReducedMotion: boolean,
): void {
  if (!el || prefersReducedMotion) return;
  el.classList.remove("kid-animate-pop");
  void el.offsetWidth;
  el.classList.add("kid-animate-pop");
  const onEnd = () => {
    el.classList.remove("kid-animate-pop");
    el.removeEventListener("animationend", onEnd);
  };
  el.addEventListener("animationend", onEnd);
}

function seededHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deterministicShuffle<T>(items: T[], seedText: string): T[] {
  const out = [...items];
  let seed = seededHash(seedText);
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function normalizeText(
  s: string,
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): string {
  let t = s;
  if (normalizeWhitespace) t = t.trim().replace(/\s+/g, " ");
  if (caseInsensitive) t = t.toLowerCase();
  return t;
}

/** Non-whitespace runs (words + attached punctuation), same as student typing. */
export function splitWordTokens(s: string): string[] {
  return s.match(/\S+/g) ?? [];
}

export function wordRegions(s: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function wordMatchToken(
  a: string,
  b: string,
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): boolean {
  return (
    normalizeText(a, caseInsensitive, normalizeWhitespace) ===
    normalizeText(b, caseInsensitive, normalizeWhitespace)
  );
}

export type InteractionControlsPlacement = "fixed" | "stage-footer";

export type NavProps = {
  muted: boolean;
  passed: boolean;
  onNext: () => void;
  onBack: () => void;
  showBack: boolean;
  /** Vocab overlay: Back/Next in orange stage footer instead of fixed viewport nav. */
  controlsPlacement?: InteractionControlsPlacement;
};

type LessonChromeContextValue = {
  controlsPlacement?: InteractionControlsPlacement;
};

const LessonChromeContext = createContext<LessonChromeContextValue>({});

/** Lets immersive embeds (e.g. LTC preview) keep Next inside the player, not the page. */
export function LessonChromeProvider({
  controlsPlacement,
  children,
}: {
  controlsPlacement?: InteractionControlsPlacement;
  children: ReactNode;
}) {
  return (
    <LessonChromeContext.Provider value={{ controlsPlacement }}>
      {children}
    </LessonChromeContext.Provider>
  );
}

export function useLessonChrome(): LessonChromeContextValue {
  return useContext(LessonChromeContext);
}

/** Matches story immersive footer buttons (click-to-reveal learn screen). */
export const STAGE_OVERLAY_BTN =
  "!min-h-9 !min-w-0 shrink-0 px-3 py-1.5 text-sm shadow-[3px_3px_0_#0a2f86]";

/** @deprecated Kept for callers; nav is now an overlay, not a reserved bar. */
export const STAGE_CHROME_FOOTER_CLASS = "h-14 shrink-0";

/** Bottom padding so activity content stays above {@link InteractionLessonNav}. */
export const interactionNavReservePaddingClass = "pb-14";

/* ── Games quiz chrome (shared look for pilots / Activity Builder exports) ── */

/** Optional hero image frame — pair with {@link interactionHeroImageHeightStyle}. */
export const gamesHeroImageFrameClass =
  "relative mb-3 w-full shrink-0 overflow-hidden rounded-lg border-4 border-kid-ink";

/** Primary prompt / body_text line. */
export const gamesBodyTextClass = "mb-4 text-xl font-semibold text-kid-ink";

/** Secondary how-to hint under the body. */
export const gamesHintTextClass = "mb-3 text-base font-semibold text-kid-ink/80";

/** Clear + Check (and similar) action row. */
export const gamesCheckActionRowClass = "mt-4 flex flex-wrap gap-2";

/** Compact KidButton chips (word bank, match tokens). */
export const gamesChipButtonClass = "!min-h-11 !min-w-0 px-3 py-2 text-base font-bold";

/** Drop / match target zone (dashed). */
export const gamesMatchZoneClass =
  "min-h-16 w-full rounded-lg border-4 border-dashed border-kid-ink bg-kid-surface-muted/50 px-3 py-2 text-left text-lg font-semibold text-kid-ink transition hover:bg-kid-surface-muted active:bg-kid-panel disabled:opacity-60";

/** Solid match tile (left column / selected). */
export const gamesMatchTileClass =
  "min-h-14 w-full rounded-lg border-4 border-kid-ink bg-kid-panel px-3 py-2 text-left text-lg font-semibold text-kid-ink transition hover:bg-kid-surface-muted active:bg-kid-surface disabled:opacity-60";

/** Selected match tile. */
export const gamesMatchTileSelectedClass =
  "min-h-14 w-full rounded-lg border-4 border-kid-ink bg-kid-cta px-3 py-2 text-left text-lg font-semibold text-kid-ink transition disabled:opacity-60";

/** Linked / placed match tile. */
export const gamesMatchTileLinkedClass =
  "min-h-14 w-full rounded-lg border-4 border-emerald-700 bg-emerald-50 px-3 py-2 text-left text-lg font-semibold text-emerald-950 transition disabled:opacity-60";

/** Inline wrong-attempt hint (Check activities). */
export const gamesWrongHintClass =
  "mt-3 rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-base font-semibold text-red-900";

const lessonNavArrowBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-kid-ink/80 bg-white/95 text-kid-ink shadow-sm transition-[transform,background-color,opacity] duration-100 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:active:scale-100";

function LessonNavChevron({ direction }: { direction: "back" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      {direction === "back" ? (
        <path
          fill="currentColor"
          d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
        />
      )}
    </svg>
  );
}

/**
 * Compact Back / Next arrows — centered on the player (all quiz activities).
 * Fixed to the viewport, or absolute inside the stage when chrome is stage-footer.
 */
export function InteractionLessonNav({
  showBack,
  onBack,
  passed,
  onNext,
  nextDisabled,
  nextLabel = "Next",
  backLabel = "Back",
  controlsPlacement: controlsPlacementProp,
}: Omit<NavProps, "muted"> & {
  /** When set, overrides the default Next disable rule (`!passed`). */
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
}) {
  const chrome = useLessonChrome();
  const placement = controlsPlacementProp ?? chrome.controlsPlacement ?? "fixed";
  const contained = placement === "stage-footer";
  const nextBtnDisabled = nextDisabled !== undefined ? nextDisabled : !passed;
  return (
    <div
      className={clsx(
        "pointer-events-none z-[100] flex justify-center",
        contained
          ? "absolute inset-x-0 bottom-2"
          : [
              "fixed",
              "inset-x-0",
              "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
            ],
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2 drop-shadow-md">
        {showBack ? (
          <button
            type="button"
            className={lessonNavArrowBtnClass}
            onClick={onBack}
            aria-label={backLabel}
          >
            <LessonNavChevron direction="back" />
          </button>
        ) : null}
        <button
          type="button"
          className={lessonNavArrowBtnClass}
          disabled={nextBtnDisabled}
          onClick={() => onNext()}
          aria-label={nextLabel}
        >
          <LessonNavChevron direction="next" />
        </button>
      </div>
    </div>
  );
}

/**
 * Same compact arrows as {@link InteractionLessonNav} (stage-footer placement).
 * Kept so immersive activities share one control — no yellow bar.
 */
export function InteractionStageFooter(
  props: Omit<NavProps, "muted" | "controlsPlacement"> & {
    nextDisabled?: boolean;
    nextLabel?: string;
    backLabel?: string;
  },
) {
  return <InteractionLessonNav {...props} controlsPlacement="stage-footer" />;
}

export function fixTextWordNeedsCorrection(
  regions: { word: string }[],
  targetWords: string[],
  index: number,
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): boolean {
  if (index < 0 || index >= regions.length) return false;
  if (targetWords.length === 0) return true;
  if (index >= targetWords.length) return true;
  return !wordMatchToken(
    regions[index].word,
    targetWords[index],
    caseInsensitive,
    normalizeWhitespace,
  );
}

function shuffleArray<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Max distractors (wrong options); correct is added separately. */
const FIX_TEXT_HINT_MAX_DECOYS = 14;

/**
 * Correct token plus decoys: every distinct teacher decoy is included, then (only if needed)
 * padded to at least two wrong options from other sentence tokens and filler words.
 * Returns shuffled list, or null if we cannot build two distinct wrong options.
 */
export function buildFixTextHintChoices(
  wordIndex: number,
  regions: { word: string }[],
  targetWords: string[],
  decoyPool: string[],
  caseInsensitive: boolean,
  normalizeWhitespace: boolean,
): string[] | null {
  if (wordIndex < 0 || wordIndex >= regions.length) return null;
  if (wordIndex >= targetWords.length) return null;
  const correct = targetWords[wordIndex];
  if (/\s/.test(correct)) return null;

  const normCorrect = normalizeText(correct, caseInsensitive, normalizeWhitespace);
  const taken = new Set<string>([normCorrect]);
  const decoys: string[] = [];

  for (const w of decoyPool) {
    if (decoys.length >= FIX_TEXT_HINT_MAX_DECOYS) break;
    const t = w.trim();
    if (!t || /\s/.test(t)) continue;
    const n = normalizeText(t, caseInsensitive, normalizeWhitespace);
    if (taken.has(n)) continue;
    taken.add(n);
    decoys.push(t);
  }

  for (let j = 0; j < regions.length && decoys.length < 2; j += 1) {
    if (j === wordIndex) continue;
    const t = regions[j].word;
    if (/\s/.test(t)) continue;
    const n = normalizeText(t, caseInsensitive, normalizeWhitespace);
    if (taken.has(n)) continue;
    taken.add(n);
    decoys.push(t);
  }

  const fallbacks = ["is", "are", "was", "the", "a", "an", "to", "of", "in", "on"];
  for (const t of fallbacks) {
    if (decoys.length >= 2) break;
    const n = normalizeText(t, caseInsensitive, normalizeWhitespace);
    if (taken.has(n)) continue;
    taken.add(n);
    decoys.push(t);
  }

  if (decoys.length < 2) return null;
  return shuffleArray([correct, ...decoys]);
}

export function useAudioRecorder(maxDurationSeconds: number) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    setDurationMs(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    clearAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const elapsed = Date.now() - startTimeRef.current;
        setAudioBlob(blob);
        setDurationMs(elapsed);
        setAudioUrl(URL.createObjectURL(blob));
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => stop(), maxDurationSeconds * 1000);
    } catch {
      setError("Microphone access was blocked. Please allow microphone permissions.");
    }
  }, [clearAudio, maxDurationSeconds, stop]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [audioUrl],
  );

  return { recording, audioBlob, audioUrl, error, durationMs, start, stop, clearAudio };
}

type VoiceSubmitResult = { uploaded: boolean; submissionId: string | null; error: string | null };

export async function uploadVoiceAnswer(args: {
  blob: Blob;
  lessonId: string;
  screenId: string;
  subtype: "voice_question" | "guided_dialogue";
  turnId?: string;
  turnIndex?: number;
  durationMs?: number;
}): Promise<VoiceSubmitResult> {
  try {
    const sessionId = resolveStudentStorageIdSync();
    const ext = args.blob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([args.blob], `voice.${ext}`, { type: args.blob.type || "audio/webm" });
    const formData = new FormData();
    formData.set("lesson_id", args.lessonId);
    formData.set("screen_id", args.screenId);
    formData.set("activity_subtype", args.subtype);
    formData.set("student_session_id", sessionId);
    formData.set("audio", file);
    if (args.turnId) formData.set("turn_id", args.turnId);
    if (args.turnIndex != null) formData.set("turn_index", String(args.turnIndex));
    if (args.durationMs != null) formData.set("duration_ms", String(args.durationMs));
    const result = await uploadStudentVoiceSubmission(formData);
    return { uploaded: true, submissionId: result.id, error: null };
  } catch (e) {
    return { uploaded: false, submissionId: null, error: e instanceof Error ? e.message : "Upload failed." };
  }
}


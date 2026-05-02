"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { uploadStudentVoiceSubmission } from "@/lib/actions/student-voice";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

/** Student-facing image in a fixed frame: default show whole image (contain). */
export function interactionImageFitClass(imageFit: "cover" | "contain" | undefined) {
  return (imageFit ?? "contain") === "contain" ? "object-contain bg-white" : "object-cover";
}

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
  return url.includes("placehold.co");
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

export type NavProps = {
  muted: boolean;
  passed: boolean;
  onNext: () => void;
  onBack: () => void;
  showBack: boolean;
};

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
    const sessionId = getProgressSnapshot().anonymousDeviceId;
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

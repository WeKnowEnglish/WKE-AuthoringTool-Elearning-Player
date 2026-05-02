"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  interactionImageFitClass,
  NavProps,
  unopt,
  useAudioRecorder,
  uploadVoiceAnswer,
} from "./shared";

export function VoiceQuestionView({
  parsed,
  screenId,
  lessonId,
  muted,
  passed,
  onPass,
  onWrong: _onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "voice_question" }>;
  screenId: string;
  lessonId: string;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps & { screenId: string; lessonId: string }) {
  const recorder = useAudioRecorder(parsed.max_duration_seconds ?? 90);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playedBack, setPlayedBack] = useState(false);
  const maxAttempts = parsed.max_attempts ?? 3;

  async function submit() {
    if (!recorder.audioBlob || passed) return;
    playSfx("tap", muted);
    setUploading(true);
    setSubmitError(null);
    const result = await uploadVoiceAnswer({
      blob: recorder.audioBlob,
      lessonId,
      screenId,
      subtype: "voice_question",
      durationMs: recorder.durationMs,
    });
    setUploading(false);
    if (!result.uploaded) {
      setSubmitError(result.error);
      return;
    }
    onPass();
  }

  return (
    <div>
      {parsed.image_url ? (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt=""
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
        </div>
      ) : null}
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        {parsed.prompt_audio_url ? (
          <audio className="mt-3 w-full" controls src={parsed.prompt_audio_url} />
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (attemptsUsed >= maxAttempts) return;
              setAttemptsUsed((v) => v + 1);
              void recorder.start();
            }}
            disabled={recorder.recording || attemptsUsed >= maxAttempts || passed}
          >
            Record
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={recorder.stop} disabled={!recorder.recording || passed}>
            Stop
          </KidButton>
          <span className="text-sm text-neutral-600">Attempts: {attemptsUsed}/{maxAttempts}</span>
        </div>
        {recorder.audioUrl ? (
          <div className="mt-3 space-y-2">
            <audio controls src={recorder.audioUrl} onPlay={() => setPlayedBack(true)} className="w-full" />
            <KidButton type="button" onClick={() => void submit()} disabled={uploading || passed || (parsed.require_playback_before_submit && !playedBack)}>
              {uploading ? "Uploading..." : "Submit recording"}
            </KidButton>
          </div>
        ) : null}
        {recorder.recording ? <p className="mt-2 text-sm text-amber-800">Recording in progress...</p> : null}
        {recorder.error || submitError ? (
          <p className="mt-2 text-sm text-red-700">{submitError ?? recorder.error}</p>
        ) : null}
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}

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

export function GuidedDialogueView({
  parsed,
  lessonId,
  screenId,
  muted,
  passed,
  onPass,
  onWrong: _onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "guided_dialogue" }>;
  lessonId: string;
  screenId: string;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps & { lessonId: string; screenId: string }) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playedPrompt, setPlayedPrompt] = useState(false);
  const turn = parsed.turns[turnIndex];
  const recorder = useAudioRecorder(turn?.max_duration_seconds ?? 90);
  const promptAudioRef = useRef<HTMLAudioElement | null>(null);

  async function submitTurn() {
    if (!turn || !recorder.audioBlob) return;
    setUploading(true);
    setSubmitError(null);
    const result = await uploadVoiceAnswer({
      blob: recorder.audioBlob,
      lessonId,
      screenId,
      subtype: "guided_dialogue",
      turnId: turn.id,
      turnIndex,
      durationMs: recorder.durationMs,
    });
    setUploading(false);
    if (!result.uploaded) {
      setSubmitError(result.error);
      return;
    }
    if (turnIndex >= parsed.turns.length - 1) {
      onPass();
      return;
    }
    setTurnIndex((v) => v + 1);
    recorder.clearAudio();
    setPlayedPrompt(false);
  }

  return (
    <div>
      <KidPanel>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-kid-ink">
            <Image
              src={parsed.character_image_url}
              alt={parsed.character_name}
              fill
              className={interactionImageFitClass(parsed.character_image_fit)}
              unoptimized={unopt(parsed.character_image_url)}
            />
          </div>
          <div>
            <p className="text-xl font-bold">{parsed.character_name}</p>
            <p className="text-sm text-neutral-600">Turn {turnIndex + 1} of {parsed.turns.length}</p>
          </div>
        </div>
        {parsed.intro_text ? <p className="mb-2 text-sm text-neutral-700">{parsed.intro_text}</p> : null}
        <p className="text-lg font-semibold">{turn.prompt_text}</p>
        {turn.prompt_audio_url ? (
          <div className="mt-3">
            <audio ref={promptAudioRef} controls src={turn.prompt_audio_url} onPlay={() => setPlayedPrompt(true)} className="w-full" />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => void recorder.start()}
            disabled={recorder.recording || (parsed.require_turn_audio_playback && turn.prompt_audio_url != null && !playedPrompt)}
          >
            Record response
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={recorder.stop} disabled={!recorder.recording}>
            Stop
          </KidButton>
        </div>
        {recorder.audioUrl ? (
          <div className="mt-3 space-y-2">
            <audio controls src={recorder.audioUrl} className="w-full" />
            <KidButton type="button" onClick={() => void submitTurn()} disabled={uploading || passed}>
              {uploading ? "Uploading..." : turnIndex >= parsed.turns.length - 1 ? "Submit final turn" : "Submit and continue"}
            </KidButton>
          </div>
        ) : null}
        {submitError || recorder.error ? <p className="mt-2 text-sm text-red-700">{submitError ?? recorder.error}</p> : null}
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

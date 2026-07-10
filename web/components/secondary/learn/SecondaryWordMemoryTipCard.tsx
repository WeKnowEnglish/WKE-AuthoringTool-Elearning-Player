"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { SecondarySyllableSpeechSpeedToggle } from "@/components/secondary/learn/SecondarySyllableSpeechSpeedToggle";
import { SecondaryWordSyllableDisplay } from "@/components/secondary/learn/SecondaryWordSyllableDisplay";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import {
  abortSyllableSpeech,
  speakWordWithMode,
  speakWordWithSyllableHighlights,
  type SpeakSyllableMode,
} from "@/lib/audio/speak-syllables";
import { unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  readSecondarySyllableSpeechMode,
  writeSecondarySyllableSpeechMode,
} from "@/lib/secondary/secondary-syllable-speech-preference";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
  centered?: boolean;
};

export function SecondaryWordMemoryTipCard({ item, centered: _centered = false }: Props) {
  const support = item.spellingSupport;
  const { muted } = useAudioMuted();
  const speechAbortRef = useRef<AbortController | null>(null);
  const [speechMode, setSpeechMode] = useState<SpeakSyllableMode>("normal");
  const [activeSyllableIndex, setActiveSyllableIndex] = useState<number | null>(null);
  const [isSpeakingWord, setIsSpeakingWord] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  const syllables = support?.syllables ?? [];
  const hasSyllables = syllables.some((part) => part.trim().length > 0);
  const mistakes = support?.commonMistakes ?? [];

  useEffect(() => {
    setSpeechAvailable(typeof window !== "undefined" && Boolean(window.speechSynthesis));
    setSpeechMode(readSecondarySyllableSpeechMode(resolveSecondaryStudentId()));
  }, []);

  const stopPlayback = useCallback(() => {
    abortSyllableSpeech(speechAbortRef.current);
    speechAbortRef.current = null;
    setActiveSyllableIndex(null);
    setIsSpeakingWord(false);
    setIsSpeaking(false);
  }, []);

  const prevWordItemIdRef = useRef(item.wordItemId);

  useEffect(() => {
    if (prevWordItemIdRef.current === item.wordItemId) return;
    prevWordItemIdRef.current = item.wordItemId;
    stopPlayback();
    setStatusMessage(null);
  }, [item.wordItemId, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  if (!support) return null;
  if (!hasSyllables && mistakes.length === 0) return null;

  function finishPlayback() {
    speechAbortRef.current = null;
    setActiveSyllableIndex(null);
    setIsSpeakingWord(false);
    setIsSpeaking(false);
  }

  function handleSpeechModeChange(mode: SpeakSyllableMode) {
    setSpeechMode(mode);
    writeSecondarySyllableSpeechMode(resolveSecondaryStudentId(), mode);
  }

  async function handleListen() {
    if (!speechAvailable) return;

    if (muted) {
      setStatusMessage("Sound is off.");
      return;
    }

    unlockSpeechSynthesis();
    stopPlayback();
    setStatusMessage(null);
    setIsSpeaking(true);
    if (!hasSyllables) {
      setIsSpeakingWord(true);
    }

    const controller = new AbortController();
    speechAbortRef.current = controller;

    if (hasSyllables) {
      await speakWordWithSyllableHighlights({
        word: item.word,
        syllables,
        mode: speechMode,
        muted,
        signal: controller.signal,
        onSyllableStart: (index) => setActiveSyllableIndex(index),
        onDone: () => finishPlayback(),
      });
      return;
    }

    await speakWordWithMode(item.word, speechMode, {
      muted,
      signal: controller.signal,
      onDone: () => finishPlayback(),
    });
  }

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className={secondaryUi.cardTitle}>Remember the word</h3>

      {hasSyllables ? (
        <SecondaryWordSyllableDisplay
          syllables={syllables}
          activeIndex={activeSyllableIndex}
        />
      ) : (
        <p
          className="mt-2 font-mono text-xl font-extrabold tracking-wide text-kid-ink"
          aria-live="polite"
        >
          <span
            className={clsx(
              "rounded px-1",
              isSpeakingWord && "bg-sky-200 text-sky-950 secondary-syllable-speak-pulse",
            )}
          >
            {item.word}
          </span>
        </p>
      )}

      {mistakes.length > 0 ? (
        <p className={`mt-2 ${secondaryUi.caption}`}>
          Common mistake{mistakes.length > 1 ? "s" : ""}:{" "}
          <span className="font-extrabold text-amber-900">{mistakes.join(", ")}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-10 text-base"
          disabled={!speechAvailable}
          onClick={() => void handleListen()}
        >
          {isSpeaking ? "Listening…" : "Listen"}
        </KidButton>
        <SecondarySyllableSpeechSpeedToggle
          mode={speechMode}
          disabled={!speechAvailable}
          onChange={handleSpeechModeChange}
        />
      </div>

      {statusMessage ? (
        <p className={clsx("mt-2", secondaryUi.caption)} role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

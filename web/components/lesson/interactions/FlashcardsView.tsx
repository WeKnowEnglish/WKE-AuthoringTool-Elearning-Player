"use client";

import { BookOpen, Mic, Quote, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  FlashcardFaceStack,
  facesForSide,
} from "@/components/teacher/word-packs/FlashcardFaceStack";
import { playSfx } from "@/lib/audio/sfx";
import {
  speakTextAndWait,
  stopSpeaking,
  unlockSpeechSynthesis,
} from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import type {
  PackFlashcardCompiledCard,
  PackFlashcardFace,
} from "@/lib/vocabulary/pack-flashcards";
import {
  deterministicShuffle,
  GuideBlock,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  NavProps,
} from "./shared";

type FlashcardsPayload = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "flashcards" }
>;

type PlayableCard = PackFlashcardCompiledCard & {
  wordAudioUrl: string | null;
  exampleAudioUrl: string | null;
  definitionAudioUrl: string | null;
};

type SpeakableFace = Exclude<PackFlashcardFace, "picture">;

function toPlayableCard(card: FlashcardsPayload["cards"][number]): PlayableCard {
  return {
    id: card.id,
    wordId: card.id,
    faces: {
      word: card.faces.word,
      definition: card.faces.definition,
      example: card.faces.example,
      pictureUrl: card.faces.picture_url,
    },
    frontFaces: [...card.front_faces],
    backFaces: [...card.back_faces],
    wordAudioUrl: card.prompt_audio_url?.trim() || null,
    exampleAudioUrl: card.example_audio_url?.trim() || null,
    definitionAudioUrl: card.definition_audio_url?.trim() || null,
  };
}

function textForFace(card: PlayableCard, face: SpeakableFace): string | null {
  if (face === "word") return card.faces.word?.trim() || null;
  if (face === "definition") return card.faces.definition?.trim() || null;
  return card.faces.example?.trim() || null;
}

function audioUrlForFace(card: PlayableCard, face: SpeakableFace): string | null {
  if (face === "word") return card.wordAudioUrl;
  if (face === "definition") return card.definitionAudioUrl;
  return card.exampleAudioUrl;
}

function FaceTypeIcon({ face }: { face: SpeakableFace }) {
  const className = "h-6 w-6 sm:h-7 sm:w-7";
  if (face === "word") return <Type className={className} aria-hidden />;
  if (face === "definition") return <BookOpen className={className} aria-hidden />;
  return <Quote className={className} aria-hidden />;
}

function faceAriaLabel(face: SpeakableFace): string {
  if (face === "word") return "Play word";
  if (face === "definition") return "Play definition";
  return "Play example";
}

async function playHtmlAudio(url: string): Promise<void> {
  const el = new Audio(url);
  try {
    await el.play();
    await new Promise<void>((resolve) => {
      if (el.ended || el.paused) {
        resolve();
        return;
      }
      const done = () => {
        el.removeEventListener("ended", done);
        el.removeEventListener("error", done);
        resolve();
      };
      el.addEventListener("ended", done);
      el.addEventListener("error", done);
    });
  } catch {
    /* ignore autoplay / CORS */
  } finally {
    el.pause();
    el.src = "";
  }
}

export function FlashcardsView({
  parsed,
  muted,
  passed,
  onPass,
  onNext,
  onBack,
  showBack,
}: {
  parsed: FlashcardsPayload;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const playGenRef = useRef(0);
  const [shuffleSeed] = useState(() => {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return String(buf[0]);
    }
    return String(Date.now());
  });

  const cards = useMemo(() => {
    const compiled = parsed.cards.map(toPlayableCard);
    if (!parsed.shuffle_cards) return compiled;
    return deterministicShuffle(compiled, `${parsed.activity_name ?? "deck"}:${shuffleSeed}`);
  }, [parsed.activity_name, parsed.cards, parsed.shuffle_cards, shuffleSeed]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playingFace, setPlayingFace] = useState<SpeakableFace | "front" | null>(null);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  }, [parsed.activity_name, parsed.cards.length, shuffleSeed]);

  const total = cards.length;
  const current = cards[index];

  const stopAllAudio = useCallback(() => {
    playGenRef.current += 1;
    stopSpeaking();
  }, []);

  const playClipOrTts = useCallback(
    async (audioUrl: string | null, text: string | null) => {
      if (muted) return;
      if (audioUrl) {
        stopSpeaking();
        await playHtmlAudio(audioUrl);
        return;
      }
      if (!text) return;
      unlockSpeechSynthesis();
      // Chrome can drop speak() if it follows cancel() in the same turn.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 40);
      });
      await speakTextAndWait(text, { muted, rate: 0.92 });
    },
    [muted],
  );

  const playFrontAudio = useCallback(async () => {
    if (!current) return;
    const text =
      textForFace(current, "word") ||
      textForFace(current, "example") ||
      textForFace(current, "definition");
    const audioUrl = current.wordAudioUrl;
    if (!audioUrl && !text) return;
    const gen = ++playGenRef.current;
    playSfx("tap", muted);
    setPlayingFace("front");
    try {
      await playClipOrTts(audioUrl, text);
    } finally {
      if (playGenRef.current === gen) setPlayingFace(null);
    }
  }, [current, muted, playClipOrTts]);

  const playFaceAudio = useCallback(
    async (face: SpeakableFace) => {
      if (!current) return;
      const text = textForFace(current, face);
      const audioUrl = audioUrlForFace(current, face);
      if (!audioUrl && !text) return;
      const gen = ++playGenRef.current;
      stopSpeaking();
      playSfx("tap", muted);
      setPlayingFace(face);
      try {
        await playClipOrTts(audioUrl, text);
      } finally {
        if (playGenRef.current === gen) setPlayingFace(null);
      }
    },
    [current, muted, playClipOrTts],
  );

  useEffect(() => {
    stopAllAudio();
    setPlayingFace(null);
    if (finished || passed || !current) return;
    if (parsed.auto_play === false || muted || flipped) return;
    const timer = window.setTimeout(() => {
      void playFrontAudio();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      stopAllAudio();
    };
    // Auto-play word audio when landing on a card front.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, finished, muted, parsed.auto_play, passed, flipped]);

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function goNext() {
    playSfx("tap", muted);
    if (index >= total - 1) {
      setFinished(true);
      if (!passed) onPass();
      return;
    }
    goTo(index + 1);
  }

  if (!current) {
    return (
      <div className={interactionNavReservePaddingClass}>
        <KidPanel>
          <p className="text-2xl font-extrabold text-kid-ink">This deck has no cards.</p>
        </KidPanel>
      </div>
    );
  }

  if (finished || passed) {
    return (
      <div className={interactionNavReservePaddingClass}>
        <KidPanel>
          <p className="text-4xl font-extrabold text-kid-ink">Nice studying!</p>
          <p className="mt-3 text-xl font-bold text-kid-ink/80">
            You finished {total} card{total === 1 ? "" : "s"}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <KidButton
              type="button"
              variant="accent"
              onClick={() => {
                setFinished(false);
                goTo(0);
              }}
            >
              Study again
            </KidButton>
          </div>
        </KidPanel>
        <GuideBlock guide={parsed.guide} />
        <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
      </div>
    );
  }

  const side = flipped ? "back" : "front";
  const sideFaces = facesForSide(current, side);
  const showPicture = sideFaces.includes("picture") && Boolean(current.faces.pictureUrl?.trim());
  const canPlayFront = Boolean(
    current.wordAudioUrl ||
      textForFace(current, "word") ||
      textForFace(current, "example") ||
      textForFace(current, "definition"),
  );

  return (
    <div className={interactionNavReservePaddingClass}>
      <KidPanel>
        <p className="mb-4 text-center text-3xl font-extrabold tabular-nums text-kid-ink">
          {index + 1}
          <span className="text-kid-ink/40"> / {total}</span>
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playSfx("tap", muted);
            setFlipped((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              playSfx("tap", muted);
              setFlipped((value) => !value);
            }
          }}
          className="flex min-h-[min(70vh,40rem)] w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-[2rem] border-4 border-kid-ink bg-white px-4 py-5 text-center transition hover:scale-[1.01] active:scale-[0.99] sm:px-8 sm:py-6"
          aria-label={flipped ? "Card back. Tap to flip." : "Card front. Tap to flip."}
        >
          {!flipped ? (
            <>
              <FlashcardFaceStack faces={sideFaces} values={current.faces} size="xl" />
              {!showPicture && sideFaces.length === 0 ? (
                <p className="text-2xl font-extrabold text-kid-ink/50">Empty card</p>
              ) : null}
            </>
          ) : (
            <div className="flex w-full max-w-2xl flex-col items-stretch gap-5">
              {sideFaces.length === 0 ? (
                <p className="text-2xl font-extrabold text-kid-ink/50">Empty card</p>
              ) : (
                sideFaces.map((face) => {
                  if (face === "picture") {
                    return (
                      <div key={face} className="flex w-full justify-center">
                        {current.faces.pictureUrl?.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={current.faces.pictureUrl}
                            alt=""
                            className="max-h-[min(40vh,20rem)] w-full max-w-xl rounded-2xl object-contain"
                          />
                        ) : (
                          <p className="text-2xl font-extrabold text-kid-ink/50">—</p>
                        )}
                      </div>
                    );
                  }

                  const text = textForFace(current, face);
                  const canPlay = Boolean(audioUrlForFace(current, face) || text);
                  const titleClass =
                    face === "word"
                      ? "text-4xl font-extrabold text-kid-ink sm:text-5xl"
                      : face === "example"
                        ? "text-xl font-semibold italic text-kid-ink/80 sm:text-2xl"
                        : "text-xl font-semibold text-kid-ink/90 sm:text-2xl";
                  const display =
                    face === "example" && text
                      ? `“${text}”`
                      : text || "—";

                  return (
                    <div
                      key={face}
                      className="flex items-center gap-3 text-left sm:gap-4"
                    >
                      <button
                        type="button"
                        disabled={!canPlay}
                        aria-label={faceAriaLabel(face)}
                        title={faceAriaLabel(face)}
                        onClick={(event) => {
                          event.stopPropagation();
                          void playFaceAudio(face);
                        }}
                        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-kid-ink bg-kid-accent text-kid-ink transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span
                          className={playingFace === face ? "animate-pulse" : undefined}
                        >
                          <FaceTypeIcon face={face} />
                        </span>
                      </button>
                      <p className={`min-w-0 flex-1 ${titleClass}`}>{display}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <KidButton
            type="button"
            variant="secondary"
            disabled={index <= 0}
            onClick={() => {
              playSfx("tap", muted);
              goTo(index - 1);
            }}
          >
            Back
          </KidButton>
          {!flipped ? (
            <button
              type="button"
              disabled={!canPlayFront}
              aria-label="Listen"
              onClick={() => void playFrontAudio()}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border-4 border-kid-ink bg-kid-accent text-kid-ink transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic
                className={`h-7 w-7 ${playingFace === "front" ? "animate-pulse" : ""}`}
                aria-hidden
              />
            </button>
          ) : null}
          <KidButton type="button" variant="accent" onClick={goNext}>
            {index >= total - 1 ? "Finish" : "Next"}
          </KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} />
    </div>
  );
}

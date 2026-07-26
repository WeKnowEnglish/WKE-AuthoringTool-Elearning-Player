"use client";

import { ExploreHotspotsMediaPlay, type PlayHotspot } from "@wke/explore-hotspots-play";
import { useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "@/lib/audio/sfx";
import { speakTextAndWait, stopSpeaking, unlockSpeechSynthesis } from "@/lib/audio/tts";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  type NavProps,
} from "./shared";

type ExploreHotspotsParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "explore_hotspots" }
>;

function SpeakerIcon({ playing = false }: { playing?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z" fill="currentColor" stroke="none" />
      {playing ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.3 5.8a8.8 8.8 0 0 1 0 12.4" />
        </>
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      )}
    </svg>
  );
}

function ListeningPromptIcon() {
  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-md shadow-orange-200"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 fill-none stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20a8 8 0 1 0-8-8" />
        <path d="M4 12v3a3 3 0 0 0 3 3h1v-6H4Zm16 0v3a3 3 0 0 1-3 3h-1v-6h4Z" />
      </svg>
    </span>
  );
}

function toPlayHotspots(parsed: ExploreHotspotsParsed): PlayHotspot[] {
  return parsed.hotspots.map((h) => ({
    id: h.id,
    accessibleLabel: h.accessible_label ?? h.name,
    tabOrder: h.tab_order,
    geometry: { shape: "polygon" as const, points: h.points },
    visualShape: h.visual_shape
      ? {
          type: "segmentation-contour" as const,
          sourceAssetId: h.visual_shape.source_asset_id,
          sourceWidth: h.visual_shape.source_width,
          sourceHeight: h.visual_shape.source_height,
          paths: h.visual_shape.paths,
          score: h.visual_shape.score,
        }
      : undefined,
    highlight: h.highlight
      ? {
          style: h.highlight.style,
          color: h.highlight.color,
          outlineWidth: h.highlight.outline_width,
          glowRadius: h.highlight.glow_radius,
          backgroundDim: h.highlight.background_dim,
        }
      : undefined,
  }));
}

async function playHtmlAudio(
  url: string,
  isCancelled: () => boolean,
): Promise<void> {
  const el = new Audio(url);
  try {
    await el.play();
    await new Promise<void>((resolve) => {
      if (isCancelled() || el.ended || el.paused) {
        el.pause();
        resolve();
        return;
      }
      const done = () => {
        window.clearInterval(poll);
        el.removeEventListener("ended", done);
        el.removeEventListener("error", done);
        resolve();
      };
      const poll = window.setInterval(() => {
        if (isCancelled()) {
          el.pause();
          done();
        }
      }, 80);
      el.addEventListener("ended", done);
      el.addEventListener("error", done);
    });
  } catch {
    /* ignore autoplay / CORS */
  }
}

export function ExploreHotspotsView({
  parsed,
  muted,
  passed,
  onPass,
  onNext,
  onBack,
  showBack,
}: {
  parsed: ExploreHotspotsParsed;
  onPass: () => void;
} & NavProps) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const playGenRef = useRef(0);
  const passedRef = useRef(false);

  const panel = parsed.dialogue_panel;
  const requiredIds = parsed.hotspots
    .filter((h) => h.required !== false)
    .map((h) => h.id);
  const visitedRequired = requiredIds.filter((id) => visited.has(id)).length;
  const allRequiredVisited =
    requiredIds.length === 0 || requiredIds.every((id) => visited.has(id));

  const activeDialogue = activeHotspotId
    ? (parsed.dialogues.find((d) => d.hotspot_id === activeHotspotId) ?? null)
    : null;

  const playHotspots = useMemo(() => toPlayHotspots(parsed), [parsed]);
  const visitedList = useMemo(() => Array.from(visited), [visited]);

  const dialogueText = useMemo(
    () =>
      activeDialogue?.turns
        .map((turn) => {
          if (turn.speak_text?.trim()) return turn.speak_text.trim();
          const speaker = turn.speaker?.trim() ?? "";
          return speaker ? `${speaker}. ${turn.text}` : turn.text;
        })
        .join(" ") ?? "",
    [activeDialogue],
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!allRequiredVisited || passedRef.current) return;
    passedRef.current = true;
    onPass();
  }, [allRequiredVisited, onPass]);

  function markVisited(hotspotId: string) {
    setVisited((prev) => {
      if (prev.has(hotspotId)) return prev;
      const next = new Set(prev);
      next.add(hotspotId);
      return next;
    });
  }

  async function playDialogue(hotspotId: string) {
    const dialogue = parsed.dialogues.find((d) => d.hotspot_id === hotspotId);
    if (!dialogue) return;
    const gen = ++playGenRef.current;
    const isCancelled = () => gen !== playGenRef.current;
    stopSpeaking();
    setSpeaking(false);
    unlockSpeechSynthesis();
    if (parsed.visited_when !== "dialogue_finished") {
      markVisited(hotspotId);
    }
    if (muted) return;
    setSpeaking(true);
    try {
      for (const turn of dialogue.turns) {
        if (isCancelled()) return;
        const clip = turn.audio_url?.trim() || "";
        const speaker = turn.speaker?.trim() ?? "";
        const line =
          turn.speak_text?.trim() ||
          (speaker ? `${speaker}. ${turn.text}` : turn.text);
        if (clip) {
          stopSpeaking();
          await playHtmlAudio(clip, isCancelled);
        } else if (line.trim()) {
          unlockSpeechSynthesis();
          await speakTextAndWait(line, { muted: false, rate: 0.88 });
        }
      }
    } finally {
      if (gen === playGenRef.current) {
        setSpeaking(false);
        if (parsed.visited_when === "dialogue_finished") {
          markVisited(hotspotId);
        }
      }
    }
  }

  function selectHotspot(hotspotId: string) {
    playSfx("tap", muted);
    setActiveHotspotId(hotspotId);
    if (parsed.auto_play_on_select !== false) {
      void playDialogue(hotspotId);
    }
    // When autoplay is off, visit credit is awarded only when Listen/Replay starts or finishes
    // (matches Studio visitedWhen semantics).
  }

  const emptyState =
    panel?.empty_state_text ?? "Choose a child in the picture to hear about their hobby.";

  return (
    <div className={interactionNavReservePaddingClass}>
      <section
        className="overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-white via-[#fffdf8] to-[#fff7ea] p-[clamp(1rem,2.2cqi,1.75rem)] text-slate-900 shadow-[0_24px_70px_rgba(30,64,175,0.14)]"
        style={{ containerType: "inline-size" }}
      >
        <header className="hotspot-player-header mb-5 gap-4">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sky-600">
              Listening explorer
            </p>
            <h2 className="mt-1 text-[clamp(1.55rem,3.2cqi,2.35rem)] font-extrabold leading-tight tracking-tight text-[#10254d]">
              {parsed.activity_name ?? "Explore"}
            </h2>
          </div>
          {panel?.show_progress !== false ? (
            <div
              className="flex items-center gap-3"
              aria-label={`Listened to ${visitedRequired} of ${requiredIds.length}`}
            >
              <span className="whitespace-nowrap rounded-full bg-[#e9f4ff] px-4 py-2 text-sm font-bold text-[#1766bb] shadow-sm">
                {visitedRequired} of {requiredIds.length} heard
              </span>
              <div className="flex gap-1.5" aria-hidden>
                {requiredIds.map((id) => (
                  <span
                    key={id}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      visited.has(id) ? "bg-[#2e87e8]" : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <div className="hotspot-player-layout">
          <div className="rounded-2xl bg-white p-1.5 shadow-[0_16px_38px_rgba(30,64,175,0.16)] ring-1 ring-slate-200/80">
            <ExploreHotspotsMediaPlay
              media={{
                src: parsed.image_url,
                alt: parsed.image_alt,
                intrinsicWidth: parsed.image_width,
                intrinsicHeight: parsed.image_height,
              }}
              hotspots={playHotspots}
              selectedId={activeHotspotId}
              visitedIds={visitedList}
              onSelect={selectHotspot}
            />
          </div>

          <aside className="flex min-h-64 flex-col gap-4" aria-live="polite">
            {parsed.body_text ? (
              <div className="flex items-center gap-4 rounded-[1.65rem] bg-gradient-to-br from-[#eef8ff] to-[#dcefff] p-5 text-[#10254d] shadow-sm ring-1 ring-sky-100">
                <ListeningPromptIcon />
                <p className="text-[clamp(1rem,1.8cqi,1.3rem)] font-bold leading-snug">
                  {parsed.body_text}
                </p>
              </div>
            ) : null}

            {activeDialogue ? (
              <div className="hotspot-speech-bubble relative mt-1 rounded-[1.75rem] border-2 border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                      {activeDialogue.title}
                    </p>
                    {panel?.show_transcript !== false ? (
                      <div className="mt-4 space-y-3">
                        {activeDialogue.turns.map((turn, index) => (
                          <div
                            key={`${activeDialogue.id}-${index}`}
                            className={
                              index === activeDialogue.turns.length - 1
                                ? "rounded-2xl bg-[#edf7ff] px-4 py-3"
                                : "px-1"
                            }
                          >
                            {turn.speaker?.trim() ? (
                              <p
                                className={`text-xs font-extrabold uppercase tracking-wide ${
                                  index === activeDialogue.turns.length - 1
                                    ? "text-[#2479cc]"
                                    : "text-amber-600"
                                }`}
                              >
                                {turn.speaker}
                              </p>
                            ) : null}
                            <p
                              className={`leading-snug text-[#13264a] ${
                                turn.speaker?.trim() ? "mt-1" : ""
                              } ${
                                index === activeDialogue.turns.length - 1
                                  ? "text-[clamp(1.2rem,2.3cqi,1.65rem)] font-bold"
                                  : "text-base font-medium"
                              }`}
                            >
                              {turn.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {panel?.show_replay !== false ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeHotspotId) return;
                        void playDialogue(activeHotspotId);
                      }}
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3198f5] to-[#146dcc] text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-300"
                      aria-label={
                        speaking
                          ? `Playing ${activeDialogue.title}`
                          : parsed.auto_play_on_select === false
                            ? `Listen to ${activeDialogue.title}`
                            : `Listen to ${activeDialogue.title} again`
                      }
                    >
                      <SpeakerIcon playing={speaking} />
                    </button>
                  ) : null}
                </div>
                <span className="sr-only">{dialogueText}</span>
              <p className="mt-4 text-right text-xs font-semibold text-slate-400">
                {speaking
                  ? "Playing dialogue…"
                  : parsed.auto_play_on_select === false
                    ? "Tap Listen to hear this dialogue"
                    : "Tap to listen again"}
              </p>
              </div>
            ) : (
              <div className="hotspot-speech-bubble relative mt-1 flex min-h-52 flex-1 items-center rounded-[1.75rem] border-2 border-slate-200 bg-white p-7 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                    Ready to explore?
                  </p>
                  <p className="mt-3 text-[clamp(1.25rem,2.3cqi,1.7rem)] font-bold leading-snug text-[#13264a]">
                    {emptyState}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Each child has something different to share.
                  </p>
                </div>
              </div>
            )}

            {allRequiredVisited && parsed.completion_message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm">
                <span aria-hidden>✓ </span>
                {parsed.completion_message}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <GuideBlock guide={parsed.guide} />
      <InteractionLessonNav
        showBack={showBack}
        onBack={onBack}
        passed={passed}
        onNext={onNext}
        nextDisabled={!allRequiredVisited}
      />
    </div>
  );
}

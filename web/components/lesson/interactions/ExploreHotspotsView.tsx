"use client";

import { ExploreHotspotsMediaPlay, type PlayHotspot } from "@wke/explore-hotspots-play";
import { useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "@/lib/audio/sfx";
import { speakTextAndWait, stopSpeaking, unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  canSelectInStrictOrder,
  hintTargetId,
  hotspotsInPhase,
  initialObjectStates,
  isDecorativeObject,
  isObjectComplete,
  isSilentObject,
  phaseComplete,
  resolvePlayPhases,
  responseStackFor,
  type ExploreHotspotItem,
  type ExploreHotspotResponseCard,
  type ExploreHotspotsParsed,
  type ObjectRuntimeState,
} from "@/lib/wke-activity/explore-hotspots-play-runtime";
import {
  GuideBlock,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  type NavProps,
} from "./shared";

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

function pointsToRectangle(
  points: Array<{ x: number; y: number }>,
): { shape: "rectangle"; x: number; y: number; width: number; height: number } {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    shape: "rectangle",
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function toPlayHotspots(hotspots: ExploreHotspotItem[]): PlayHotspot[] {
  return hotspots.map((h) => ({
    id: h.id,
    accessibleLabel: h.accessible_label ?? h.name,
    tabOrder: h.tab_order,
    geometry:
      h.presentation === "sprite"
        ? pointsToRectangle(h.points)
        : { shape: "polygon" as const, points: h.points },
    presentation: h.presentation,
    spriteSrc: h.sprite_url,
    interactionKind: h.interaction_kind,
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
  const phases = useMemo(() => resolvePlayPhases(parsed), [parsed]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [objectStates, setObjectStates] = useState<Record<string, ObjectRuntimeState>>(
    () => initialObjectStates(parsed.hotspots),
  );
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [orderHint, setOrderHint] = useState<string | null>(null);
  const [showHintPulse, setShowHintPulse] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState<string | null>(null);
  const playGenRef = useRef(0);
  const passedRef = useRef(false);

  const panel = parsed.dialogue_panel;
  const currentPhase = phases[Math.min(phaseIndex, phases.length - 1)]!;
  const phaseHotspots = useMemo(
    () => hotspotsInPhase(parsed, currentPhase),
    [parsed, currentPhase],
  );
  const playHotspots = useMemo(() => toPlayHotspots(phaseHotspots), [phaseHotspots]);

  const requiredAll = parsed.hotspots.filter((h) => h.required !== false);
  const completedRequired = requiredAll.filter((h) =>
    isObjectComplete(h, objectStates[h.id]),
  ).length;
  const allRequiredDone =
    requiredAll.length === 0 ||
    requiredAll.every((h) => isObjectComplete(h, objectStates[h.id]));
  const currentPhaseDone = phaseComplete(phaseHotspots, objectStates);
  const hasNextPhase = phaseIndex < phases.length - 1;
  const activityComplete = allRequiredDone && !hasNextPhase;

  const activeHotspot =
    phaseHotspots.find((h) => h.id === activeHotspotId) ??
    parsed.hotspots.find((h) => h.id === activeHotspotId) ??
    null;
  const cards = activeHotspot ? responseStackFor(activeHotspot) : [];
  const activeCard: ExploreHotspotResponseCard | null = cards[cardIndex] ?? null;

  const activeDialogue =
    activeHotspot &&
    (activeCard?.kind === "dialogue" ||
      (!activeCard && (activeHotspot.interaction_kind ?? "dialogue") === "dialogue"))
      ? (parsed.dialogues.find((d) =>
          activeCard?.kind === "dialogue" && activeCard.dialogue_id
            ? d.id === activeCard.dialogue_id
            : d.hotspot_id === activeHotspot.id,
        ) ?? null)
      : null;

  const visitedList = useMemo(
    () =>
      Object.entries(objectStates)
        .filter(([, state]) => state === "discovered" || state === "completed")
        .map(([id]) => id),
    [objectStates],
  );

  const lockedIds = useMemo(() => {
    const locked: string[] = [];
    for (const hotspot of phaseHotspots) {
      const state = objectStates[hotspot.id];
      if (state === "locked") locked.push(hotspot.id);
      else if (
        parsed.strict_order &&
        !canSelectInStrictOrder(
          hotspot,
          phaseHotspots,
          objectStates,
          true,
        ) &&
        !isObjectComplete(hotspot, state)
      ) {
        // Still selectable to show wrong-order hint; do not lock visually.
      }
    }
    return locked;
  }, [phaseHotspots, objectStates, parsed.strict_order]);

  const pulseId =
    showHintPulse && parsed.hint_pulse_enabled
      ? hintTargetId(phaseHotspots, objectStates, true)
      : null;

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
    if (!activityComplete || passedRef.current) return;
    passedRef.current = true;
    onPass();
  }, [activityComplete, onPass]);

  function setObjectState(hotspotId: string, state: ObjectRuntimeState) {
    setObjectStates((prev) => {
      if (prev[hotspotId] === state) return prev;
      return { ...prev, [hotspotId]: state };
    });
  }

  function markDiscoveredOrCompleted(hotspot: ExploreHotspotItem, completed: boolean) {
    setObjectState(hotspot.id, completed ? "completed" : "discovered");
  }

  async function playDialogueFor(hotspotId: string) {
    const dialogue = parsed.dialogues.find((d) => d.hotspot_id === hotspotId);
    if (!dialogue) return;
    const gen = ++playGenRef.current;
    const isCancelled = () => gen !== playGenRef.current;
    stopSpeaking();
    setSpeaking(false);
    unlockSpeechSynthesis();
    const hotspot = parsed.hotspots.find((h) => h.id === hotspotId);
    if (hotspot && parsed.visited_when !== "dialogue_finished") {
      markDiscoveredOrCompleted(hotspot, true);
    }
    if (muted) {
      if (hotspot && parsed.visited_when === "dialogue_finished") {
        markDiscoveredOrCompleted(hotspot, true);
      }
      return;
    }
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
        if (hotspot && parsed.visited_when === "dialogue_finished") {
          markDiscoveredOrCompleted(hotspot, true);
        }
      }
    }
  }

  function advanceCardOrComplete(hotspot: ExploreHotspotItem, forceComplete = true) {
    const stack = responseStackFor(hotspot);
    if (cardIndex + 1 < stack.length) {
      setCardIndex((value) => value + 1);
      setQuestionFeedback(null);
      return;
    }
    if (forceComplete) markDiscoveredOrCompleted(hotspot, true);
  }

  async function beginCardStack(hotspot: ExploreHotspotItem) {
    const stack = responseStackFor(hotspot);
    const first = stack[0];
    setQuestionFeedback(null);
    if (!first) {
      markDiscoveredOrCompleted(hotspot, true);
      return;
    }
    if (first.kind === "dialogue") {
      if (parsed.auto_play_on_select !== false) {
        void playDialogueFor(hotspot.id);
      } else if (parsed.visited_when !== "dialogue_finished") {
        // Visit credit deferred until Listen when autoplay off + started semantics
      }
    } else if (first.kind === "info") {
      markDiscoveredOrCompleted(hotspot, false);
    } else if (first.kind === "audio" && first.audio_url && !muted) {
      const gen = ++playGenRef.current;
      setSpeaking(true);
      try {
        await playHtmlAudio(first.audio_url, () => gen !== playGenRef.current);
      } finally {
        if (gen === playGenRef.current) setSpeaking(false);
      }
      markDiscoveredOrCompleted(hotspot, stack.length === 1);
    }
  }

  function selectHotspot(hotspotId: string) {
    playSfx("tap", muted);
    const hotspot = phaseHotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;

    if (isDecorativeObject(hotspot)) return;

    if (objectStates[hotspotId] === "locked") {
      setOrderHint("This object is locked for now.");
      return;
    }

    if (
      !canSelectInStrictOrder(
        hotspot,
        phaseHotspots,
        objectStates,
        Boolean(parsed.strict_order),
      )
    ) {
      setOrderHint(
        hotspot.wrong_order_hint?.trim() ||
          "Try another object first — follow the order.",
      );
      setActiveHotspotId(null);
      setCardIndex(0);
      return;
    }

    setOrderHint(null);
    setShowHintPulse(false);

    if (isSilentObject(hotspot) || responseStackFor(hotspot).length === 0) {
      markDiscoveredOrCompleted(hotspot, true);
      setActiveHotspotId(null);
      setCardIndex(0);
      setQuestionFeedback(null);
      return;
    }

    setActiveHotspotId(hotspotId);
    setCardIndex(0);
    void beginCardStack(hotspot);
  }

  function goNextPhase() {
    if (!hasNextPhase || !currentPhaseDone) return;
    playGenRef.current += 1;
    stopSpeaking();
    setSpeaking(false);
    setPhaseIndex((value) => value + 1);
    setActiveHotspotId(null);
    setCardIndex(0);
    setOrderHint(null);
    setQuestionFeedback(null);
    setShowHintPulse(false);
  }

  const emptyState =
    panel?.empty_state_text ?? "Choose something in the picture to explore.";

  const checklistItems = phaseHotspots.filter((h) => h.required !== false);

  return (
    <div className={interactionNavReservePaddingClass}>
      <section
        className="overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-white via-[#fffdf8] to-[#fff7ea] p-[clamp(1rem,2.2cqi,1.75rem)] text-slate-900 shadow-[0_24px_70px_rgba(30,64,175,0.14)]"
        style={{ containerType: "inline-size" }}
      >
        <header className="hotspot-player-header mb-5 gap-4">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sky-600">
              {phases.length > 1
                ? `Scene ${phaseIndex + 1} of ${phases.length}`
                : "Listening explorer"}
            </p>
            <h2 className="mt-1 text-[clamp(1.55rem,3.2cqi,2.35rem)] font-extrabold leading-tight tracking-tight text-[#10254d]">
              {currentPhase.title ?? parsed.activity_name ?? "Explore"}
            </h2>
            {parsed.objective?.label ? (
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {parsed.objective.label}
              </p>
            ) : null}
          </div>
          {panel?.show_progress !== false ? (
            <div
              className="flex flex-col items-end gap-2"
              aria-label={`Completed ${completedRequired} of ${requiredAll.length}`}
            >
              <span className="whitespace-nowrap rounded-full bg-[#e9f4ff] px-4 py-2 text-sm font-bold text-[#1766bb] shadow-sm">
                {completedRequired} of {requiredAll.length} done
              </span>
              {checklistItems.length > 0 ? (
                <ul className="flex max-w-xs flex-wrap justify-end gap-1.5">
                  {checklistItems.map((item) => {
                    const done = isObjectComplete(item, objectStates[item.id]);
                    return (
                      <li
                        key={item.id}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          done
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {done ? "✓ " : ""}
                        {item.name ?? item.id}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="hotspot-player-layout">
          <div className="rounded-2xl bg-white p-1.5 shadow-[0_16px_38px_rgba(30,64,175,0.16)] ring-1 ring-slate-200/80">
            <ExploreHotspotsMediaPlay
              media={{
                src: currentPhase.image_url,
                alt: currentPhase.image_alt ?? parsed.image_alt,
                intrinsicWidth: currentPhase.image_width ?? parsed.image_width,
                intrinsicHeight: currentPhase.image_height ?? parsed.image_height,
              }}
              hotspots={playHotspots}
              selectedId={activeHotspotId}
              visitedIds={visitedList}
              lockedIds={lockedIds}
              hintPulseId={pulseId}
              onSelect={selectHotspot}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              {parsed.hint_pulse_enabled ? (
                <button
                  type="button"
                  className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200"
                  onClick={() => setShowHintPulse(true)}
                >
                  Hint
                </button>
              ) : (
                <span />
              )}
              {hasNextPhase ? (
                <button
                  type="button"
                  disabled={!currentPhaseDone}
                  className="rounded-full bg-sky-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  onClick={goNextPhase}
                >
                  Next scene
                </button>
              ) : null}
            </div>
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

            {orderHint ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                {orderHint}
              </div>
            ) : null}

            {activeHotspot && activeCard?.kind === "info" ? (
              <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  {activeHotspot.name ?? "Info"}
                </p>
                <p className="mt-3 text-[clamp(1.15rem,2.1cqi,1.5rem)] font-bold leading-snug text-[#13264a]">
                  {activeCard.text}
                </p>
                {activeCard.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeCard.image_url}
                    alt=""
                    className="mt-4 max-h-40 rounded-xl object-contain"
                  />
                ) : null}
                <button
                  type="button"
                  className="mt-4 rounded-full bg-sky-700 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => advanceCardOrComplete(activeHotspot)}
                >
                  Continue
                </button>
              </div>
            ) : null}

            {activeHotspot && activeCard?.kind === "audio" ? (
              <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  {activeCard.label ?? "Listen"}
                </p>
                <button
                  type="button"
                  className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3198f5] to-[#146dcc] text-white shadow-lg"
                  aria-label="Play audio"
                  onClick={() => {
                    if (!activeCard.audio_url || muted) return;
                    void (async () => {
                      const gen = ++playGenRef.current;
                      setSpeaking(true);
                      try {
                        await playHtmlAudio(
                          activeCard.audio_url,
                          () => gen !== playGenRef.current,
                        );
                      } finally {
                        if (gen === playGenRef.current) setSpeaking(false);
                      }
                    })();
                  }}
                >
                  <SpeakerIcon playing={speaking} />
                </button>
                <button
                  type="button"
                  className="mt-4 rounded-full bg-sky-700 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => advanceCardOrComplete(activeHotspot)}
                >
                  Continue
                </button>
              </div>
            ) : null}

            {activeHotspot && activeCard?.kind === "question" ? (
              <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  Question
                </p>
                <p className="mt-3 text-[clamp(1.15rem,2.1cqi,1.5rem)] font-bold leading-snug text-[#13264a]">
                  {activeCard.prompt}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {activeCard.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-sky-400 hover:bg-sky-50"
                      onClick={() => {
                        const correct = choice.id === activeCard.correct_choice_id;
                        if (correct) {
                          setQuestionFeedback("Correct!");
                          playSfx("correct", muted);
                          if (activeCard.gate_discover !== false) {
                            markDiscoveredOrCompleted(activeHotspot, true);
                          }
                          window.setTimeout(
                            () => advanceCardOrComplete(activeHotspot, true),
                            450,
                          );
                        } else {
                          setQuestionFeedback("Try again.");
                          setObjectState(activeHotspot.id, "incorrect");
                          playSfx("wrong", muted);
                        }
                      }}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                {questionFeedback ? (
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {questionFeedback}
                  </p>
                ) : null}
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
                        void playDialogueFor(activeHotspotId);
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
                <div className="mt-4 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-400">
                    {speaking
                      ? "Playing dialogue…"
                      : parsed.auto_play_on_select === false
                        ? "Tap Listen to hear this dialogue"
                        : "Tap to listen again"}
                  </p>
                  {cards.length > 1 ? (
                    <button
                      type="button"
                      className="rounded-full bg-sky-700 px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() =>
                        activeHotspot && advanceCardOrComplete(activeHotspot)
                      }
                    >
                      Continue
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!activeHotspot && !orderHint ? (
              <div className="hotspot-speech-bubble relative mt-1 flex min-h-52 flex-1 items-center rounded-[1.75rem] border-2 border-slate-200 bg-white p-7 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                    Ready to explore?
                  </p>
                  <p className="mt-3 text-[clamp(1.25rem,2.3cqi,1.7rem)] font-bold leading-snug text-[#13264a]">
                    {emptyState}
                  </p>
                </div>
              </div>
            ) : null}

            {activityComplete ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm">
                <span aria-hidden>✓ </span>
                {parsed.completion_message ?? "Great exploring — you found everything!"}
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
        nextDisabled={!activityComplete}
      />
    </div>
  );
}

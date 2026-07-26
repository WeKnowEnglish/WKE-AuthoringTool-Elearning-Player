"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import { speakTextAndWait, stopSpeaking, unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  buildSentenceWordBank,
  choicesForRole,
  isHighlightedWord,
  isMorphologyMark,
  morphologySplitPattern,
  nextSlotOptionId,
  optionsForSlot,
  remixOptionIdsForRole,
  resolveBubbleText,
  resolveBuildValues,
  resolveMorphology,
  resolveSentence,
  resolveSlotLabels,
  shuffleWithSeed,
  splitStemAndSuffix,
  type BuildWordCard,
  type LanguageInFocusChunkRole,
  type LanguageInFocusMorphology,
} from "@/lib/language-in-focus";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  GuideBlock,
  InteractionLessonNav,
  interactionNavReservePaddingClass,
  unopt,
  type NavProps,
} from "./shared";

type LanguageInFocusParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "language_in_focus" }
>;

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

type Layer = NonNullable<LanguageInFocusParsed["layers"]>[number];

const ROLE_FALLBACK_COLORS: Record<string, string> = {
  person: "#0d9488",
  feeling: "#ca8a04",
  activity: "#2563eb",
  subject: "#0d9488",
  modal: "#ca8a04",
  verb: "#2563eb",
  object: "#7c3aed",
  other: "#64748b",
};

function renderInlineBold(text: string, morphology?: LanguageInFocusMorphology) {
  const morph = resolveMorphology(morphology);
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      const isMorph =
        isMorphologyMark(inner, morph) || isLegacyMorphologyMark(inner);
      return (
        <strong
          key={i}
          className={isMorph ? "font-extrabold text-red-600" : "font-extrabold text-sky-800"}
        >
          {inner}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function isLegacyMorphologyMark(text: string) {
  const t = text.trim().toLowerCase();
  return (
    t === "-s" ||
    t === "-ing" ||
    t === "s" ||
    t === "ing" ||
    t === "+s" ||
    t === "+ing" ||
    t === "n't" ||
    t === "-n't" ||
    t === "+n't"
  );
}

/** Highlight the letters added when turning base → form (e.g. like→likes, can→can't). */
function renderStemWithSuffix(base: string, form: string) {
  const { stem, suffix } = splitStemAndSuffix(base, form);
  if (!suffix) return form;
  return (
    <>
      {stem}
      <span className="text-red-600">{suffix}</span>
    </>
  );
}

/** Highlight morphology marks / configured words inside a phrase. */
function renderGrammarPhrase(text: string, morphology: LanguageInFocusMorphology) {
  const parts = text.split(morphologySplitPattern(morphology));
  return parts.map((part, i) => {
    if (!part) return null;
    if (isMorphologyMark(part, morphology) || isLegacyMorphologyMark(part)) {
      return (
        <span key={i} className="text-red-600">
          {part}
        </span>
      );
    }
    if (isHighlightedWord(part, morphology)) {
      const lower = part.toLowerCase();
      // Prefer showing added ending in red when the word ends with a known suffix.
      for (const suffix of morphology.word_suffixes) {
        const s = suffix.trim().toLowerCase();
        if (!s) continue;
        if (s === "n't" && /n'?t$/i.test(lower)) {
          const cut = part.toLowerCase().endsWith("n't") ? 3 : 2;
          return (
            <span key={i}>
              {part.slice(0, Math.max(0, part.length - cut))}
              <span className="text-red-600">{part.slice(Math.max(0, part.length - cut))}</span>
            </span>
          );
        }
        if (lower.endsWith(s) && part.length > s.length) {
          return (
            <span key={i}>
              {part.slice(0, part.length - s.length)}
              <span className="text-red-600">{part.slice(part.length - s.length)}</span>
            </span>
          );
        }
      }
      // Exact highlight words without a clean suffix split (e.g. likes → like + s).
      if (/likes$/i.test(part)) {
        return (
          <span key={i}>
            {part.slice(0, -1)}
            <span className="text-red-600">{part.slice(-1)}</span>
          </span>
        );
      }
      return (
        <span key={i} className="text-red-600">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderGrammarNote(note: string, morphology: LanguageInFocusMorphology) {
  const parts = note.split(morphologySplitPattern(morphology));
  return parts.map((part, i) => {
    if (!part) return null;
    if (isMorphologyMark(part, morphology) || isLegacyMorphologyMark(part)) {
      return (
        <span key={i} className="text-red-600">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

type GrammarMeaningIconId =
  | "me"
  | "girl"
  | "boy"
  | "heart"
  | "pencil"
  | "book"
  | "dance"
  | "ball"
  | "music";

function GrammarMeaningIcon({
  icon,
  className = "h-8 w-8",
}: {
  icon: GrammarMeaningIconId;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 48 48",
    className,
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "me":
      return (
        <svg {...common} fill="none">
          <circle cx="24" cy="14" r="8" fill="#0d9488" />
          <path
            d="M10 40c0-8 6.3-14 14-14s14 6 14 14"
            stroke="#0d9488"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="38" cy="12" r="5" fill="#fbbf24" opacity="0.9" />
        </svg>
      );
    case "girl":
      return (
        <svg {...common} fill="none">
          <path
            d="M16 18c0-5.5 3.6-10 8-10s8 4.5 8 10c0 2-0.5 3.8-1.4 5.2L34 36H14l3.4-12.8C16.5 21.8 16 20 16 18Z"
            fill="#db2777"
          />
          <circle cx="24" cy="16" r="6.5" fill="#fce7f3" />
          <path
            d="M18 16.5c1.2 1.4 2.8 2.2 6 2.2s4.8-.8 6-2.2"
            stroke="#be185d"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="21.2" cy="15.2" r="1.1" fill="#831843" />
          <circle cx="26.8" cy="15.2" r="1.1" fill="#831843" />
          <path
            d="M22.4 18.2c.8.7 2.4.7 3.2 0"
            stroke="#be185d"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "boy":
      return (
        <svg {...common} fill="none">
          <path
            d="M15 38c0-7.2 4-12 9-12s9 4.8 9 12"
            fill="#2563eb"
          />
          <circle cx="24" cy="16" r="7" fill="#93c5fd" />
          <path
            d="M16.5 14c1.2-4 4-6.5 7.5-6.5S30.3 10 31.5 14"
            fill="#1d4ed8"
          />
          <circle cx="21.2" cy="15.5" r="1.2" fill="#1e3a8a" />
          <circle cx="26.8" cy="15.5" r="1.2" fill="#1e3a8a" />
          <path
            d="M22.2 18.6c1 .9 2.6.9 3.6 0"
            stroke="#1e3a8a"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} fill="none">
          <path
            d="M24 40s-14-8.8-14-18.2C10 15 14.2 11 19 11c2.8 0 4.6 1.4 5 2.2.4-.8 2.2-2.2 5-2.2 4.8 0 9 4 9 10.8C38 31.2 24 40 24 40Z"
            fill="#e11d48"
          />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common} fill="none">
          <path d="M30 8 40 18 18 40H8V30L30 8Z" fill="#f59e0b" />
          <path d="M30 8 40 18 36 22 26 12 30 8Z" fill="#fbbf24" />
          <path d="M8 30 18 40 12 40 8 36V30Z" fill="#78716c" />
          <path d="M26 12 36 22" stroke="#b45309" strokeWidth="2" />
        </svg>
      );
    case "book":
      return (
        <svg {...common} fill="none">
          <path d="M8 10h14v28H12a4 4 0 0 1-4-4V10Z" fill="#2563eb" />
          <path d="M26 10h14v24a4 4 0 0 1-4 4H26V10Z" fill="#60a5fa" />
          <path d="M22 10v28" stroke="#1e40af" strokeWidth="2" />
        </svg>
      );
    case "dance":
      return (
        <svg {...common} fill="none">
          <circle cx="24" cy="10" r="5" fill="#db2777" />
          <path
            d="M24 16c-4 6-10 10-10 18h6l4-8 4 8h6c0-8-6-12-10-18Z"
            fill="#f472b6"
          />
          <path
            d="M14 22c4 1 7-1 10-1s6 2 10 1"
            stroke="#be185d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ball":
      return (
        <svg {...common} fill="none">
          <circle cx="24" cy="24" r="14" fill="#16a34a" />
          <path
            d="M24 10c4 4 6 8 6 14s-2 10-6 14c-4-4-6-8-6-14s2-10 6-14Z"
            stroke="#fff"
            strokeWidth="2"
          />
          <path d="M10 24h28M13 17h22M13 31h22" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    case "music":
      return (
        <svg {...common} fill="none">
          <path
            d="M18 34a5 5 0 1 1-2-4V12l18-4v18a5 5 0 1 1-2-4V14.5L18 16.2V34Z"
            fill="#9333ea"
          />
        </svg>
      );
    default:
      return null;
  }
}

function ReferenceMeaningItem({
  item,
  morphology,
}: {
  item: {
    id: string;
    text: string;
    note?: string;
    base?: string;
    form?: string;
    icon?: GrammarMeaningIconId;
  };
  morphology: LanguageInFocusMorphology;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      {item.icon ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <GrammarMeaningIcon icon={item.icon} className="h-8 w-8" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {item.base && item.form ? (
          <p className="flex flex-wrap items-center gap-2 text-[clamp(1.05rem,3.2cqi,1.35rem)] font-black text-slate-800">
            <span>{item.base}</span>
            <span className="text-slate-400" aria-hidden>
              →
            </span>
            <span>{renderStemWithSuffix(item.base, item.form)}</span>
          </p>
        ) : (
          <p className="text-[clamp(1.05rem,3.2cqi,1.35rem)] font-black text-slate-800">
            {renderGrammarPhrase(item.text, morphology)}
          </p>
        )}
        {item.note ? (
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            {renderGrammarNote(item.note, morphology)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function SpeakerIcon({ playing = false }: { playing?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
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

function WandIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 4 2 2" />
      <path d="m5 14 8-8 4 4-8 8H5v-4Z" />
      <path d="M9 7h.01" />
      <path d="M17 15h.01" />
    </svg>
  );
}

type PuzzlePlacement = "start" | "middle" | "end" | "only";

function puzzlePlacement(index: number, total: number): PuzzlePlacement {
  if (total <= 1) return "only";
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

function resolveLayers(parsed: LanguageInFocusParsed): Layer[] {
  if (parsed.layers && parsed.layers.length > 0) return parsed.layers;
  return [
    {
      type: "workbench",
      id: "default-workbench",
      elements: parsed.workbench ?? [],
    },
  ];
}

function PuzzleShell({
  word,
  roleLabel,
  color,
  placement,
  empty,
  selected,
  dropActive,
  locked,
  grammarFocus,
  hint,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  word?: string;
  roleLabel: string;
  color: string;
  placement: PuzzlePlacement;
  empty?: boolean;
  selected?: boolean;
  dropActive?: boolean;
  locked?: boolean;
  /** Remix staging: click opens grammar tip (not remove). */
  grammarFocus?: boolean;
  /** Soft pulse/glow to draw attention. */
  hint?: boolean;
  onClick?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent) => void;
}) {
  const hasTab = placement === "start" || placement === "middle";
  const hasSocket = placement === "middle" || placement === "end";
  const stack =
    placement === "start" ? 3 : placement === "middle" ? 2 : 1;
  const shellLocked = !!locked && !!word;
  const canClick = !!onClick && (!shellLocked || !!grammarFocus);

  return (
    <div
      className={`lif-chunk relative min-h-[4.75rem] min-w-[5.25rem] flex-1 ${
        hint ? "lif-hint-pulse-amber" : ""
      }`}
      style={{
        marginLeft: hasSocket ? "-0.7rem" : 0,
        zIndex: hint ? 5 : stack,
        borderRadius:
          placement === "only"
            ? "0.85rem"
            : placement === "start"
              ? "0.85rem 0.3rem 0.3rem 0.85rem"
              : placement === "end"
                ? "0.3rem 0.85rem 0.85rem 0.3rem"
                : "0.3rem",
      }}
    >
      <button
        type="button"
        disabled={shellLocked ? !onClick : false}
        onClick={onClick}
        onDragOver={shellLocked ? undefined : onDragOver}
        onDragLeave={shellLocked ? undefined : onDragLeave}
        onDrop={shellLocked ? undefined : onDrop}
        className={`relative flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-0.5 px-2.5 py-2.5 text-center shadow-sm transition ${
          empty ? "bg-slate-50/90" : shellLocked ? "bg-teal-50" : "bg-white"
        } ${dropActive && !shellLocked ? "ring-2 ring-offset-1 ring-teal-400" : ""} ${
          selected ? "ring-2 ring-offset-1 ring-amber-400" : ""
        } ${shellLocked && !selected ? "ring-2 ring-teal-400 ring-offset-1" : ""} ${
          canClick ? "cursor-pointer" : ""
        }`}
        style={{
          borderStyle: empty ? "dashed" : "solid",
          borderColor: selected ? "#f59e0b" : shellLocked ? "#0d9488" : color,
          borderWidth: "2.5px",
          borderRadius:
            placement === "only"
              ? "0.85rem"
              : placement === "start"
                ? "0.85rem 0.3rem 0.3rem 0.85rem"
                : placement === "end"
                  ? "0.3rem 0.85rem 0.85rem 0.3rem"
                  : "0.3rem",
          paddingLeft: hasSocket ? "1.15rem" : undefined,
          paddingRight: hasTab ? "1.15rem" : undefined,
          ...(hasSocket
            ? {
                maskImage:
                  "radial-gradient(circle 0.7rem at 0.05rem 50%, transparent 0.67rem, #000 0.69rem)",
                WebkitMaskImage:
                  "radial-gradient(circle 0.7rem at 0.05rem 50%, transparent 0.67rem, #000 0.69rem)",
              }
            : {}),
        }}
        aria-label={
          word
            ? grammarFocus
              ? `${roleLabel}: ${word}. Show grammar tip.`
              : shellLocked && onClick
                ? `${roleLabel}: ${word}. Show grammar tip.`
                : shellLocked
                  ? `${roleLabel}: ${word}. Correct.`
                  : `${roleLabel}: ${word}. Click to remove.`
            : `Empty ${roleLabel} puzzle piece. Drop a word here.`
        }
        aria-pressed={selected || undefined}
      >
        {word ? (
          <p
            className="text-[clamp(1.2rem,3.4cqi,1.7rem)] font-black leading-none tracking-tight"
            style={{ color }}
          >
            {word}
          </p>
        ) : (
          <p className="text-[1.35rem] font-black leading-none text-slate-300">?</p>
        )}
        <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-500">
          {roleLabel}
        </p>
      </button>

      {hasTab ? (
        <>
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 z-20 block h-[1.35rem] w-[1.35rem] -translate-y-1/2 rounded-full ${
              empty
                ? "bg-slate-50"
                : selected
                  ? "bg-white"
                  : shellLocked
                    ? "bg-teal-50"
                    : "bg-white"
            }`}
            style={{
              right: "-0.7rem",
              borderStyle: empty ? "dashed" : "solid",
              borderWidth: "2.5px",
              borderColor: selected ? "#f59e0b" : shellLocked ? "#0d9488" : color,
            }}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 z-30 block h-4 w-1.5 -translate-y-1/2 ${
              empty
                ? "bg-slate-50"
                : selected
                  ? "bg-white"
                  : shellLocked
                    ? "bg-teal-50"
                    : "bg-white"
            }`}
            style={{ right: "-1px" }}
          />
        </>
      ) : null}
    </div>
  );
}

function WordPuzzleCard({
  card,
  color,
  selected,
  disabled,
  onSelect,
}: {
  card: BuildWordCard;
  color: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={onSelect}
      className={`relative min-w-[3.75rem] rounded-xl border-2 bg-white px-2 py-1 text-center shadow-sm transition ${
        selected ? "ring-2 ring-amber-400 ring-offset-1" : ""
      } ${disabled ? "cursor-default opacity-40" : "cursor-grab active:cursor-grabbing hover:-translate-y-0.5"}`}
      style={{ borderColor: color }}
      aria-pressed={selected}
      aria-label={`Word card: ${card.label}`}
    >
      <span
        aria-hidden
        className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-white"
        style={{ borderColor: color }}
      />
      <p className="pr-0.5 text-sm font-extrabold leading-tight" style={{ color }}>
        {card.label}
      </p>
    </button>
  );
}

function fillNamedPrompt(template: string, tabLabel: string) {
  return template.replaceAll("{tab}", tabLabel).replaceAll("{name}", tabLabel);
}

export function LanguageInFocusView({
  parsed,
  muted,
  passed,
  onPass,
  onNext,
  onBack,
  showBack,
}: {
  parsed: LanguageInFocusParsed;
  onPass: () => void;
} & NavProps) {
  const layers = useMemo(() => resolveLayers(parsed), [parsed]);
  const morphology = useMemo(
    () => resolveMorphology(parsed.morphology),
    [parsed.morphology],
  );
  const [layerIndex, setLayerIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundPhase, setRoundPhase] = useState<"listen" | "build">("listen");
  const [heardThisRound, setHeardThisRound] = useState(false);
  const [completedRoundIds, setCompletedRoundIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeTabId, setActiveTabId] = useState(parsed.tabs[0]!.id);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set([parsed.tabs[0]!.id]),
  );
  const [visitedFocusRoles, setVisitedFocusRoles] = useState(
    () => new Set<LanguageInFocusChunkRole>(),
  );
  const [sentenceChangeCount, setSentenceChangeCount] = useState(0);
  const [changesByTab, setChangesByTab] = useState<Record<string, number>>({});
  const [exploreHintVisible, setExploreHintVisible] = useState(false);
  const exploreHintArmedRef = useRef(false);
  const exploreLastActionAtRef = useRef(0);
  const [exampleValues, setExampleValues] = useState<Record<string, Record<string, string>>>(
    () =>
      Object.fromEntries(parsed.examples.map((ex) => [ex.id, { ...ex.values }])),
  );
  const [placedByRole, setPlacedByRole] = useState<
    Partial<Record<LanguageInFocusChunkRole, string>>
  >({});
  const [lockedRoles, setLockedRoles] = useState(
    () => new Set<LanguageInFocusChunkRole>(),
  );
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [dropRole, setDropRole] = useState<LanguageInFocusChunkRole | null>(null);
  const [roundBuildComplete, setRoundBuildComplete] = useState(false);
  const [showRetryHint, setShowRetryHint] = useState(false);
  const [focusRole, setFocusRole] = useState<LanguageInFocusChunkRole | null>(
    null,
  );
  const [speaking, setSpeaking] = useState(false);
  const playGenRef = useRef(0);
  const passedRef = useRef(false);

  const activeLayer = layers[Math.min(layerIndex, layers.length - 1)]!;
  const activeExample =
    parsed.examples.find((ex) => ex.tab_id === activeTabId) ?? parsed.examples[0]!;
  const activeValues = exampleValues[activeExample.id] ?? activeExample.values;

  const listenBuildLayer =
    activeLayer.type === "listen_and_build" ? activeLayer : null;
  const sentenceBuildLayer =
    activeLayer.type === "sentence_build" ? activeLayer : null;

  const listenBuildExamples = useMemo(() => {
    if (!listenBuildLayer) return [];
    const ids = listenBuildLayer.example_ids?.length
      ? listenBuildLayer.example_ids
      : parsed.examples.map((ex) => ex.id);
    return ids
      .map((id) => parsed.examples.find((ex) => ex.id === id))
      .filter((ex): ex is (typeof parsed.examples)[number] => !!ex);
  }, [listenBuildLayer, parsed.examples]);

  const roundExample =
    listenBuildExamples[Math.min(roundIndex, Math.max(0, listenBuildExamples.length - 1))] ??
    null;

  const buildTargetExample = useMemo(() => {
    if (listenBuildLayer && roundExample) return roundExample;
    if (sentenceBuildLayer) {
      return (
        parsed.examples.find((ex) => ex.id === sentenceBuildLayer.example_id) ??
        parsed.examples[0]!
      );
    }
    return parsed.examples[0]!;
  }, [listenBuildLayer, roundExample, sentenceBuildLayer, parsed.examples]);

  const buildTargetValues = useMemo(() => {
    if (listenBuildLayer && roundExample) {
      return resolveBuildValues(roundExample);
    }
    if (sentenceBuildLayer) {
      return resolveBuildValues(buildTargetExample);
    }
    return buildTargetExample.values;
  }, [
    listenBuildLayer,
    roundExample,
    sentenceBuildLayer,
    buildTargetExample,
  ]);

  const isBuildPhase =
    !!sentenceBuildLayer ||
    (!!listenBuildLayer && roundPhase === "build" && heardThisRound);

  const distractors =
    listenBuildLayer?.distractor_option_ids ??
    sentenceBuildLayer?.distractor_option_ids ??
    [];

  const wordBank = useMemo(() => {
    if (!isBuildPhase) return [] as BuildWordCard[];
    const cards = buildSentenceWordBank({
      chunks: parsed.chunks,
      slotBanks: parsed.slot_banks,
      targetValues: buildTargetValues,
      distractorOptionIds: distractors,
      choicesByRole: roundExample?.build_choices ?? buildTargetExample.build_choices,
    });
    const seed = listenBuildLayer
      ? `${listenBuildLayer.id}:${buildTargetExample.id}:${roundIndex}`
      : `${sentenceBuildLayer?.id ?? "build"}:${buildTargetExample.id}`;
    return shuffleWithSeed(cards, seed);
  }, [
    isBuildPhase,
    parsed.chunks,
    parsed.slot_banks,
    buildTargetValues,
    distractors,
    listenBuildLayer,
    sentenceBuildLayer?.id,
    buildTargetExample,
    roundExample?.build_choices,
    roundIndex,
  ]);

  const placedIds = useMemo(
    () => new Set(Object.values(placedByRole).filter(Boolean) as string[]),
    [placedByRole],
  );

  const sentence = useMemo(
    () =>
      resolveSentence(
        parsed.sentence_template,
        activeValues,
        parsed.chunks,
        parsed.slot_banks,
      ),
    [parsed.sentence_template, activeValues, parsed.chunks, parsed.slot_banks],
  );

  const { byRole, byChunkId } = useMemo(
    () => resolveSlotLabels(activeValues, parsed.chunks, parsed.slot_banks),
    [activeValues, parsed.chunks, parsed.slot_banks],
  );

  const listenSentence = useMemo(() => {
    if (!roundExample) return "";
    return resolveSentence(
      parsed.sentence_template,
      roundExample.values,
      parsed.chunks,
      parsed.slot_banks,
    );
  }, [roundExample, parsed.sentence_template, parsed.chunks, parsed.slot_banks]);

  const correctBuildSentence = useMemo(
    () =>
      resolveSentence(
        parsed.sentence_template,
        buildTargetValues,
        parsed.chunks,
        parsed.slot_banks,
      ),
    [
      parsed.sentence_template,
      buildTargetValues,
      parsed.chunks,
      parsed.slot_banks,
    ],
  );

  const roundTab =
    roundExample
      ? (parsed.tabs.find((t) => t.id === roundExample.tab_id) ?? null)
      : null;

  const allTabsVisited = parsed.tabs.every((t) => visitedTabs.has(t.id));
  const explore = parsed.completion.explore;
  const requiredGrammarRoles = useMemo(() => {
    const panels = parsed.reference?.focus_panels ?? [];
    if (panels.length > 0) return panels.map((p) => p.role);
    return parsed.chunks.map((c) => c.role);
  }, [parsed.reference?.focus_panels, parsed.chunks]);

  const allGrammarRolesVisited =
    requiredGrammarRoles.length === 0 ||
    requiredGrammarRoles.every((role) => visitedFocusRoles.has(role));

  const minSentenceChanges = explore?.min_sentence_changes ?? 0;
  const minChangesPerTab = explore?.min_changes_per_tab ?? 0;
  const enoughSentenceChanges = sentenceChangeCount >= minSentenceChanges;
  const eachTabChangedEnough =
    minChangesPerTab <= 0 ||
    parsed.tabs.every((tab) => (changesByTab[tab.id] ?? 0) >= minChangesPerTab);

  const exploreComplete =
    !explore ||
    ((explore.all_tabs !== false ? allTabsVisited : true) &&
      (explore.all_grammar_roles !== false ? allGrammarRolesVisited : true) &&
      enoughSentenceChanges &&
      eachTabChangedEnough);

  type ExploreHintTarget =
    | { kind: "friend_tab"; tabId: string }
    | { kind: "grammar_role"; role: LanguageInFocusChunkRole }
    | { kind: "sentence_change" };

  const nextExploreHint = useMemo((): ExploreHintTarget | null => {
    if (!explore || exploreComplete) return null;

    if (explore.all_tabs !== false) {
      const unvisited = parsed.tabs.find((tab) => !visitedTabs.has(tab.id));
      if (unvisited) return { kind: "friend_tab", tabId: unvisited.id };
    }

    if (minChangesPerTab > 0) {
      const needy = parsed.tabs.find(
        (tab) => (changesByTab[tab.id] ?? 0) < minChangesPerTab,
      );
      if (needy) {
        if (needy.id !== activeTabId) {
          return { kind: "friend_tab", tabId: needy.id };
        }
        return { kind: "sentence_change" };
      }
    }

    if (minSentenceChanges > 0 && sentenceChangeCount < minSentenceChanges) {
      return { kind: "sentence_change" };
    }

    if (explore.all_grammar_roles !== false) {
      const role = requiredGrammarRoles.find(
        (r) => !visitedFocusRoles.has(r),
      );
      if (role) return { kind: "grammar_role", role };
    }

    return null;
  }, [
    explore,
    exploreComplete,
    parsed.tabs,
    visitedTabs,
    minChangesPerTab,
    changesByTab,
    activeTabId,
    minSentenceChanges,
    sentenceChangeCount,
    requiredGrammarRoles,
    visitedFocusRoles,
  ]);

  function bumpExploreActivity() {
    exploreLastActionAtRef.current = Date.now();
    setExploreHintVisible(false);
  }

  useEffect(() => {
    if (activeLayer.type !== "workbench" || !explore || exploreComplete) {
      setExploreHintVisible(false);
      return;
    }
    if (exploreLastActionAtRef.current === 0) {
      exploreLastActionAtRef.current = Date.now();
    }
    const delayMs = exploreHintArmedRef.current ? 3000 : 5000;
    const timer = window.setInterval(() => {
      if (!nextExploreHint) {
        setExploreHintVisible(false);
        return;
      }
      if (Date.now() - exploreLastActionAtRef.current >= delayMs) {
        setExploreHintVisible(true);
        exploreHintArmedRef.current = true;
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [
    activeLayer.type,
    explore,
    exploreComplete,
    nextExploreHint,
    visitedTabs,
    visitedFocusRoles,
    sentenceChangeCount,
    changesByTab,
    activeTabId,
  ]);

  const activeExploreHint =
    exploreHintVisible && nextExploreHint ? nextExploreHint : null;

  const showReference =
    !!parsed.reference && layerIndex >= (parsed.reference_from_layer ?? 1);

  const referenceInteractive = activeLayer.type === "workbench";
  const focusPanels = parsed.reference?.focus_panels ?? [];
  const activeFocusPanel =
    referenceInteractive && focusRole != null
      ? (focusPanels.find((panel) => panel.role === focusRole) ?? null)
      : null;
  const generalHint = parsed.reference?.general ?? null;

  function selectFocusRole(role: LanguageInFocusChunkRole) {
    if (!referenceInteractive) return;
    playSfx("tap", muted);
    bumpExploreActivity();
    setFocusRole(role);
    setVisitedFocusRoles((prev) => {
      if (prev.has(role)) return prev;
      const next = new Set(prev);
      next.add(role);
      return next;
    });
  }

  const listenBuildFinished =
    !!listenBuildLayer &&
    listenBuildExamples.length > 0 &&
    completedRoundIds.size >= listenBuildExamples.length;

  const workbenchExploreReady =
    activeLayer.type !== "workbench" || exploreComplete;

  const activityComplete =
    parsed.completion.type === "visit_all_tabs"
      ? allTabsVisited && exploreComplete
      : layerIndex >= layers.length - 1 &&
        workbenchExploreReady &&
        (activeLayer.type !== "sentence_build" || roundBuildComplete) &&
        (activeLayer.type !== "listen_and_build" || listenBuildFinished);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!isBuildPhase || roundBuildComplete) return;
    const allFilled = parsed.chunks.every((chunk) => placedByRole[chunk.role]);
    if (!allFilled) return;

    const nextPlaced: Partial<Record<LanguageInFocusChunkRole, string>> = {};
    const nextLocked = new Set<LanguageInFocusChunkRole>();
    let allCorrect = true;
    for (const chunk of parsed.chunks) {
      const expected =
        buildTargetValues[chunk.role] ?? buildTargetValues[chunk.id];
      const placed = placedByRole[chunk.role];
      if (placed && placed === expected) {
        nextPlaced[chunk.role] = placed;
        nextLocked.add(chunk.role);
      } else {
        allCorrect = false;
      }
    }

    if (!allCorrect) {
      playSfx("wrong", muted);
      setPlacedByRole(nextPlaced);
      setLockedRoles(nextLocked);
      setShowRetryHint(true);
      setSelectedWordId(null);
      return;
    }

    playSfx("correct", muted);
    setLockedRoles(nextLocked);
    setShowRetryHint(false);
    setRoundBuildComplete(true);
    setSelectedWordId(null);
    if (roundExample) {
      setCompletedRoundIds((prev) => {
        const next = new Set(prev);
        next.add(roundExample.id);
        return next;
      });
    }
  }, [
    isBuildPhase,
    roundBuildComplete,
    buildTargetValues,
    placedByRole,
    parsed.chunks,
    muted,
    roundExample,
  ]);

  useEffect(() => {
    if (!roundBuildComplete) return;

    let cancelled = false;
    const gen = ++playGenRef.current;

    async function celebrateAndAdvance() {
      if (!muted && correctBuildSentence) {
        stopSpeaking();
        setSpeaking(false);
        unlockSpeechSynthesis();
        setSpeaking(true);
        try {
          await speakTextAndWait(correctBuildSentence, {
            muted: false,
            rate: 0.9,
          });
        } finally {
          if (gen === playGenRef.current) setSpeaking(false);
        }
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, muted ? 800 : 450),
      );
      if (cancelled || gen !== playGenRef.current) return;

      if (listenBuildLayer) {
        const nextRound = roundIndex + 1;
        if (nextRound < listenBuildExamples.length) {
          setRoundIndex(nextRound);
          setRoundPhase("listen");
          setHeardThisRound(false);
          setPlacedByRole({});
          setLockedRoles(new Set());
          setShowRetryHint(false);
          setSelectedWordId(null);
          setRoundBuildComplete(false);
          const nextEx = listenBuildExamples[nextRound];
          if (nextEx) setActiveTabId(nextEx.tab_id);
          return;
        }
        if (layerIndex < layers.length - 1) {
          setLayerIndex((i) => i + 1);
          setRoundBuildComplete(false);
          setLockedRoles(new Set());
          setShowRetryHint(false);
          setActiveTabId(parsed.tabs[0]!.id);
          setVisitedTabs(new Set([parsed.tabs[0]!.id]));
          setVisitedFocusRoles(new Set());
          setSentenceChangeCount(0);
          setChangesByTab({});
          setExploreHintVisible(false);
          exploreHintArmedRef.current = false;
          exploreLastActionAtRef.current = Date.now();
          setFocusRole(null);
          seedRemixExampleValues();
        }
        return;
      }

      if (sentenceBuildLayer && layerIndex < layers.length - 1) {
        setLayerIndex((i) => i + 1);
        setRoundBuildComplete(false);
        setLockedRoles(new Set());
        setShowRetryHint(false);
        setActiveTabId(parsed.tabs[0]!.id);
        setVisitedFocusRoles(new Set());
        setSentenceChangeCount(0);
        setChangesByTab({});
        setExploreHintVisible(false);
        exploreHintArmedRef.current = false;
        exploreLastActionAtRef.current = Date.now();
        setFocusRole(null);
        seedRemixExampleValues();
      }
    }

    void celebrateAndAdvance();
    return () => {
      cancelled = true;
    };
  }, [
    roundBuildComplete,
    correctBuildSentence,
    muted,
    listenBuildLayer,
    sentenceBuildLayer,
    roundIndex,
    listenBuildExamples,
    layerIndex,
    layers.length,
    parsed.tabs,
  ]);

  useEffect(() => {
    if (!activityComplete || passedRef.current) return;
    if (parsed.completion.type === "visit_all_tabs" && !allTabsVisited) return;
    if (parsed.completion.type === "complete_all_layers") {
      const onLast = layerIndex >= layers.length - 1;
      if (!onLast) return;
      if (activeLayer.type === "workbench" && !exploreComplete) return;
      if (activeLayer.type === "sentence_build" && !roundBuildComplete) return;
      if (activeLayer.type === "listen_and_build" && !listenBuildFinished) return;
    }
    passedRef.current = true;
    onPass();
  }, [
    activityComplete,
    allTabsVisited,
    exploreComplete,
    activeLayer.type,
    roundBuildComplete,
    listenBuildFinished,
    layerIndex,
    layers.length,
    onPass,
    parsed.completion.type,
  ]);

  function selectTab(tabId: string) {
    playSfx("tap", muted);
    bumpExploreActivity();
    setActiveTabId(tabId);
    setVisitedTabs((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  }

  function seedRemixExampleValues() {
    setExampleValues(
      Object.fromEntries(
        parsed.examples.map((ex) => [ex.id, resolveBuildValues(ex)]),
      ),
    );
  }

  function recordSentenceChange(tabId: string = activeTabId) {
    bumpExploreActivity();
    setSentenceChangeCount((n) => n + 1);
    setChangesByTab((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1,
    }));
  }

  function setSlotForActiveExample(role: string, optionId: string) {
    const current =
      exampleValues[activeExample.id]?.[role] ?? activeExample.values[role];
    if (current === optionId) return;
    recordSentenceChange(activeExample.tab_id);
    setExampleValues((prev) => ({
      ...prev,
      [activeExample.id]: {
        ...(prev[activeExample.id] ?? activeExample.values),
        [role]: optionId,
      },
    }));
  }

  function cycleSlot(
    role: string,
    optionIds?: string[] | null,
  ) {
    const bank = parsed.slot_banks.find((b) => b.role === role);
    if (!bank) return;
    const practiceOptions = optionsForSlot(bank, optionIds);
    if (practiceOptions.length === 0) return;
    const current = activeValues[role] ?? practiceOptions[0]!.id;
    const next = nextSlotOptionId(bank, current, optionIds);
    playSfx("tap", muted);
    setSlotForActiveExample(role, next);
  }

  async function hearSentence() {
    playSfx("tap", muted);
    const gen = ++playGenRef.current;
    stopSpeaking();
    setSpeaking(false);
    unlockSpeechSynthesis();
    if (muted) return;
    setSpeaking(true);
    try {
      await speakTextAndWait(sentence, { muted: false, rate: 0.9 });
    } finally {
      if (gen === playGenRef.current) setSpeaking(false);
    }
  }

  async function hearRoundFirstPerson() {
    if (!roundExample || !roundTab) return;
    playSfx("tap", muted);
    const gen = ++playGenRef.current;
    const isCancelled = () => gen !== playGenRef.current;
    stopSpeaking();
    setSpeaking(false);
    unlockSpeechSynthesis();
    setHeardThisRound(true);
    setActiveTabId(roundExample.tab_id);
    if (muted) {
      if (listenBuildLayer?.require_listen_before_build !== false) {
        setRoundPhase("build");
      }
      return;
    }
    setSpeaking(true);
    try {
      const clip = roundExample.audio_url?.trim() || "";
      if (clip) {
        stopSpeaking();
        await playHtmlAudio(clip, isCancelled);
      } else if (listenSentence) {
        unlockSpeechSynthesis();
        await speakTextAndWait(listenSentence, { muted: false, rate: 0.9 });
      }
    } finally {
      if (gen === playGenRef.current) {
        setSpeaking(false);
        if (listenBuildLayer?.require_listen_before_build !== false) {
          setRoundPhase("build");
        }
      }
    }
  }

  function findCard(optionId: string) {
    return wordBank.find((c) => c.id === optionId);
  }

  function tryPlaceWord(role: LanguageInFocusChunkRole, optionId: string) {
    if (roundBuildComplete || !isBuildPhase || lockedRoles.has(role)) return;
    const card = findCard(optionId);
    if (!card) return;
    if (card.role !== role) {
      playSfx("wrong", muted);
      setSelectedWordId(null);
      return;
    }
    playSfx("tap", muted);
    setShowRetryHint(false);
    setPlacedByRole((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as LanguageInFocusChunkRole[]) {
        if (lockedRoles.has(key)) continue;
        if (next[key] === optionId) delete next[key];
      }
      next[role] = optionId;
      return next;
    });
    setSelectedWordId(null);
  }

  function clearShell(role: LanguageInFocusChunkRole) {
    if (roundBuildComplete || !isBuildPhase || lockedRoles.has(role)) return;
    playSfx("tap", muted);
    setPlacedByRole((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  }

  function onShellClick(role: LanguageInFocusChunkRole) {
    if (roundBuildComplete || !isBuildPhase || lockedRoles.has(role)) return;
    if (selectedWordId) {
      tryPlaceWord(role, selectedWordId);
      return;
    }
    if (placedByRole[role]) clearShell(role);
  }

  function isRoleLocked(role: LanguageInFocusChunkRole) {
    return roundBuildComplete || lockedRoles.has(role);
  }

  const aspect = parsed.scene.aspect_ratio ?? "3:1";
  const [aw, ah] = aspect.split(":").map(Number);
  const sceneAspect = aw > 0 && ah > 0 ? `${aw} / ${ah}` : "3 / 1";

  const hintFriendTabId =
    activeExploreHint?.kind === "friend_tab" ? activeExploreHint.tabId : null;
  const hintGrammarRole =
    activeExploreHint?.kind === "grammar_role" ? activeExploreHint.role : null;
  const hintSentenceControls = activeExploreHint?.kind === "sentence_change";

  function renderWorkbenchElements(
    elements: NonNullable<LanguageInFocusParsed["workbench"]>,
  ) {
    return elements.map((el, index) => {
      if (el.type === "example_tabs") {
        return (
          <div
            key={`wb-${index}-tabs`}
            className="space-y-2"
          >
            <p className="text-sm font-extrabold text-slate-700 sm:text-base">
              Choose a friend
            </p>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(parsed.tabs.length, 3)}, minmax(0, 1fr))`,
              }}
              role="tablist"
              aria-label="Friends"
            >
              {parsed.tabs.map((tab) => {
                const active = tab.id === activeTabId;
                const visited = visitedTabs.has(tab.id);
                const showHint = hintFriendTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`min-h-[3.25rem] rounded-2xl px-3 py-3 text-center text-lg font-black transition sm:min-h-[3.75rem] sm:text-xl ${
                      active
                        ? "bg-teal-600 text-white shadow-md shadow-teal-200 ring-2 ring-teal-300 ring-offset-2"
                        : visited
                          ? "bg-teal-50 text-teal-900 ring-2 ring-teal-200"
                          : "bg-white text-slate-800 ring-2 ring-slate-300 hover:bg-teal-50"
                    } ${showHint ? "lif-hint-pulse" : ""}`}
                    onClick={() => selectTab(tab.id)}
                  >
                    <span className="block leading-none">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      if (el.type === "chunk_dissection") {
        return (
          <div key={`wb-${index}-chunks`} className="space-y-3">
            <div className="flex items-stretch">
              {parsed.chunks.map((chunk, chunkIndex) => {
                const color =
                  chunk.color ??
                  ROLE_FALLBACK_COLORS[chunk.role] ??
                  ROLE_FALLBACK_COLORS.other;
                const label = byChunkId[chunk.id] ?? byRole[chunk.role] ?? "…";
                const focused = focusRole === chunk.role;
                const hintGrammar = hintGrammarRole === chunk.role;
                return (
                  <PuzzleShell
                    key={chunk.id}
                    word={label}
                    roleLabel={chunk.label}
                    color={color}
                    placement={puzzlePlacement(chunkIndex, parsed.chunks.length)}
                    selected={focused}
                    grammarFocus
                    hint={hintGrammar}
                    onClick={() => selectFocusRole(chunk.role)}
                  />
                );
              })}
            </div>
            {el.show_full_sentence !== false ? (
              <p className="flex items-center gap-2 text-base font-bold text-slate-800">
                <SpeakerIcon playing={speaking} />
                <span>
                  {parsed.chunks.map((chunk, i) => {
                    const color =
                      chunk.color ??
                      ROLE_FALLBACK_COLORS[chunk.role] ??
                      ROLE_FALLBACK_COLORS.other;
                    const label = byChunkId[chunk.id] ?? byRole[chunk.role] ?? "";
                    return (
                      <span key={chunk.id}>
                        {i > 0 ? " " : null}
                        <span style={{ color }}>{label}</span>
                      </span>
                    );
                  })}
                  .
                </span>
              </p>
            ) : null}
          </div>
        );
      }

      if (el.type === "slot_chooser") {
        const bank = parsed.slot_banks.find((b) => b.role === el.role);
        if (!bank) return null;
        const practiceOptions = optionsForSlot(bank, el.option_ids);
        if (practiceOptions.length === 0) return null;
        const selected = activeValues[el.role];
        const hasCycleControl = elements.some(
          (item) =>
            item.type === "action_row" && item.actions.includes("cycle_slot"),
        );
        const altHobby = practiceOptions.find((o) => o.id !== selected);
        return (
          <div key={`wb-${index}-chooser`} className="space-y-2">
            {el.prompt ? (
              <p className="text-sm font-bold text-slate-600">{el.prompt}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {practiceOptions.map((opt) => {
                const active = selected === opt.id;
                const showHint =
                  hintSentenceControls &&
                  !hasCycleControl &&
                  altHobby?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`rounded-full px-3.5 py-2 text-sm font-extrabold transition ${
                      active
                        ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-sky-50"
                    } ${showHint ? "lif-hint-pulse" : ""}`}
                    onClick={() => {
                      playSfx("tap", muted);
                      setSlotForActiveExample(el.role, opt.id);
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      if (el.type === "action_row") {
        return (
          <div key={`wb-${index}-actions`} className="flex flex-wrap gap-3 pt-1">
            {el.actions.map((action) => {
              if (action === "hear_sentence") {
                return (
                  <KidButton
                    key={action}
                    type="button"
                    variant="primary"
                    className="inline-flex items-center gap-2"
                    onClick={() => void hearSentence()}
                  >
                    <SpeakerIcon playing={speaking} />
                    Hear the sentence
                  </KidButton>
                );
              }
              if (action === "cycle_slot" && el.cycle_role) {
                const practiceIds = remixOptionIdsForRole(
                  elements,
                  el.cycle_role,
                  el.cycle_option_ids,
                );
                return (
                  <span
                    key={action}
                    className={hintSentenceControls ? "lif-hint-pulse inline-flex rounded-2xl" : "inline-flex"}
                  >
                    <KidButton
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-2 !bg-orange-500 !text-white hover:!bg-orange-600"
                      onClick={() => cycleSlot(el.cycle_role!, practiceIds)}
                    >
                      <WandIcon />
                      Make a new example
                    </KidButton>
                  </span>
                );
              }
              return null;
            })}
          </div>
        );
      }

      return null;
    });
  }

  return (
    <div className={interactionNavReservePaddingClass}>
      <section
        className="lif-shell overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-[#f7fbff] to-[#eef8f4] px-3 py-2.5 text-slate-900 shadow-[0_12px_36px_rgba(14,116,144,0.1)] sm:px-4 sm:py-3"
        style={{ containerType: "inline-size" }}
      >
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
              {parsed.activity_name ?? "Look at the pattern"}
            </h2>
          </div>
          <p className="shrink-0 rounded-full bg-teal-50 px-2.5 py-0.5 text-[0.7rem] font-bold text-teal-800">
            Step {layerIndex + 1}/{layers.length}
            {listenBuildLayer
              ? ` · ${Math.min(roundIndex + 1, listenBuildExamples.length)}/${listenBuildExamples.length}`
              : ""}
            {activeLayer.type === "workbench" && explore
              ? ` · explore ${[
                  explore.all_tabs !== false
                    ? `${visitedTabs.size}/${parsed.tabs.length} friends`
                    : null,
                  explore.all_grammar_roles !== false
                    ? `${visitedFocusRoles.size}/${requiredGrammarRoles.length} tips`
                    : null,
                  `${sentenceChangeCount}/${minSentenceChanges} changes`,
                ]
                  .filter(Boolean)
                  .join(" · ")}`
              : activeLayer.type === "workbench"
                ? ` · ${visitedTabs.size}/${parsed.tabs.length}`
                : ""}
          </p>
        </header>

        <div className="lif-layout">
          <div className="min-w-0 space-y-2">
            <div
              className="lif-scene relative w-full overflow-hidden rounded-xl border border-slate-200 bg-sky-50"
              style={{
                aspectRatio: sceneAspect,
                maxHeight: "min(26dvh, 240px)",
              }}
            >
              <Image
                src={parsed.scene.image_url}
                alt={parsed.scene.image_alt ?? ""}
                fill
                className={
                  (parsed.scene.image_fit ?? "cover") === "cover"
                    ? "object-cover"
                    : "object-contain"
                }
                unoptimized={unopt(parsed.scene.image_url)}
                sizes="(max-width: 900px) 100vw, 70vw"
                priority
              />
              {activeLayer.type === "workbench"
                ? parsed.bubbles.map((bubble) => {
                    const example = parsed.examples.find(
                      (e) => e.id === bubble.example_id,
                    );
                    if (!example) return null;
                    const tab = parsed.tabs.find((t) => t.id === example.tab_id);
                    const values = exampleValues[example.id] ?? example.values;
                    const bubbleSentence = resolveSentence(
                      parsed.sentence_template,
                      values,
                      parsed.chunks,
                      parsed.slot_banks,
                    );
                    const text = resolveBubbleText({
                      bubbleTemplate: parsed.bubble_template,
                      sentence: bubbleSentence,
                      tabLabel: tab?.label ?? "",
                      textOverride: example.bubble_overrides?.[bubble.id],
                    });
                    const isActive = example.tab_id === activeTabId;
                    return (
                      <button
                        key={bubble.id}
                        type="button"
                        className={`lif-bubble absolute z-10 max-w-[42%] rounded-xl border px-2 py-1 text-left text-xs font-bold shadow-sm transition ${
                          isActive
                            ? "border-teal-500 bg-white text-slate-900"
                            : "border-slate-200 bg-white/90 text-slate-600"
                        }`}
                        style={{
                          left: `${bubble.x_percent}%`,
                          top: `${bubble.y_percent}%`,
                          transform: "translate(-50%, 0)",
                        }}
                        onClick={() => selectTab(example.tab_id)}
                      >
                        {text}
                      </button>
                    );
                  })
                : activeLayer.type === "listen_and_build" &&
                    heardThisRound &&
                    roundExample
                  ? parsed.bubbles
                      .filter((b) => b.example_id === roundExample.id)
                      .map((bubble) => {
                        const example = roundExample;
                        const bubbleSentence = resolveSentence(
                          parsed.sentence_template,
                          example.values,
                          parsed.chunks,
                          parsed.slot_banks,
                        );
                        const text =
                          example.bubble_overrides?.[bubble.id]?.trim() ||
                          bubbleSentence;
                        return (
                          <div
                            key={bubble.id}
                            className="lif-bubble absolute z-10 max-w-[42%] rounded-xl border border-teal-500 bg-white px-2 py-1 text-left text-xs font-bold text-slate-900 shadow-sm"
                            style={{
                              left: `${bubble.x_percent}%`,
                              top: `${bubble.y_percent}%`,
                              transform: "translate(-50%, 0)",
                            }}
                          >
                            {text}
                          </div>
                        );
                      })
                  : null}
            </div>

            {listenBuildLayer && roundExample && roundTab ? (
              <div className="space-y-2 rounded-xl border border-teal-100 bg-white/70 p-2.5 sm:p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {listenBuildExamples.map((ex, idx) => {
                    const tab = parsed.tabs.find((t) => t.id === ex.tab_id);
                    const done = completedRoundIds.has(ex.id);
                    const current = idx === roundIndex;
                    return (
                      <span
                        key={ex.id}
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold ${
                          current
                            ? "bg-teal-600 text-white"
                            : done
                              ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200"
                              : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {tab?.label ?? ex.id}
                      </span>
                    );
                  })}
                </div>

                {roundPhase === "listen" || !heardThisRound ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {listenBuildLayer.listen_prompt?.trim() ? (
                      <p className="text-xs font-bold text-slate-600 sm:text-sm">
                        {fillNamedPrompt(
                          listenBuildLayer.listen_prompt,
                          roundTab.label,
                        )}
                      </p>
                    ) : null}
                    <KidButton
                      type="button"
                      variant="primary"
                      className="!min-h-9 inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-sm"
                      onClick={() => void hearRoundFirstPerson()}
                    >
                      <SpeakerIcon playing={speaking} />
                      Listen
                    </KidButton>
                  </div>
                ) : null}

                {isBuildPhase ? (
                  <div className="space-y-2">
                    {listenBuildLayer.build_prompt?.trim() ? (
                      <p className="text-xs font-bold text-slate-600 sm:text-sm">
                        {fillNamedPrompt(
                          listenBuildLayer.build_prompt,
                          roundTab.label,
                        )}
                      </p>
                    ) : null}
                    <div className="flex items-start">
                      {parsed.chunks.map((chunk, chunkIndex) => {
                        const color =
                          chunk.color ??
                          ROLE_FALLBACK_COLORS[chunk.role] ??
                          ROLE_FALLBACK_COLORS.other;
                        const optionId = placedByRole[chunk.role];
                        const card = optionId ? findCard(optionId) : undefined;
                        const roleLocked = isRoleLocked(chunk.role);
                        const roleChoices = choicesForRole(
                          wordBank,
                          chunk.role,
                          `${buildTargetExample.id}:${roundIndex}`,
                        );
                        return (
                          <div
                            key={chunk.id}
                            className="flex min-w-0 flex-1 flex-col gap-1.5"
                          >
                            <PuzzleShell
                              word={card?.label}
                              roleLabel={chunk.label}
                              color={color}
                              placement={puzzlePlacement(
                                chunkIndex,
                                parsed.chunks.length,
                              )}
                              empty={!card}
                              dropActive={dropRole === chunk.role}
                              locked={roleLocked}
                              onClick={() => {
                                if (optionId && !roleLocked) clearShell(chunk.role);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDropRole(chunk.role);
                              }}
                              onDragLeave={() => setDropRole(null)}
                              onDrop={(event) => {
                                event.preventDefault();
                                setDropRole(null);
                                const id = event.dataTransfer.getData("text/plain");
                                if (id) tryPlaceWord(chunk.role, id);
                              }}
                            />
                            {!roleLocked ? (
                              <div className="flex flex-wrap justify-center gap-1.5 px-0.5">
                                {roleChoices.map((choice) => {
                                  const choiceColor =
                                    choice.color ??
                                    ROLE_FALLBACK_COLORS[choice.role] ??
                                    ROLE_FALLBACK_COLORS.other;
                                  const selected =
                                    placedByRole[chunk.role] === choice.id;
                                  return (
                                    <WordPuzzleCard
                                      key={choice.id}
                                      card={choice}
                                      color={choiceColor}
                                      selected={selected}
                                      disabled={roundBuildComplete}
                                      onSelect={() => {
                                        if (roundBuildComplete) return;
                                        if (selected) {
                                          clearShell(chunk.role);
                                          return;
                                        }
                                        tryPlaceWord(chunk.role, choice.id);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {showRetryHint && !roundBuildComplete ? (
                      <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">
                        Good start — keep the green pieces and try the empty ones again.
                      </p>
                    ) : null}
                    {roundBuildComplete ? (
                      <p className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-900">
                        Great!{" "}
                        {roundIndex + 1 < listenBuildExamples.length
                          ? "Next friend…"
                          : "Remix unlocked."}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {sentenceBuildLayer ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700">
                  {sentenceBuildLayer.prompt ??
                    "Build the sentence. Drag each word into the matching puzzle piece."}
                </p>

                <div className="flex items-stretch">
                  {parsed.chunks.map((chunk, chunkIndex) => {
                    const color =
                      chunk.color ??
                      ROLE_FALLBACK_COLORS[chunk.role] ??
                      ROLE_FALLBACK_COLORS.other;
                    const optionId = placedByRole[chunk.role];
                    const card = optionId ? findCard(optionId) : undefined;
                    const roleLocked = isRoleLocked(chunk.role);
                    return (
                      <PuzzleShell
                        key={chunk.id}
                        word={card?.label}
                        roleLabel={chunk.label}
                        color={color}
                        placement={puzzlePlacement(chunkIndex, parsed.chunks.length)}
                        empty={!card}
                        selected={!!selectedWordId && !card}
                        dropActive={dropRole === chunk.role}
                        locked={roleLocked}
                        onClick={() => onShellClick(chunk.role)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropRole(chunk.role);
                        }}
                        onDragLeave={() => setDropRole(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDropRole(null);
                          const id = event.dataTransfer.getData("text/plain");
                          if (id) tryPlaceWord(chunk.role, id);
                        }}
                      />
                    );
                  })}
                </div>

                {showRetryHint && !roundBuildComplete ? (
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    Good start — keep the green pieces and try the empty ones again.
                  </p>
                ) : null}

                {roundBuildComplete ? (
                  <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-900">
                    Nice! The sentence fits together.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-600">
                      Word pieces
                      {selectedWordId ? " · tap a puzzle shell to place" : ""}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {wordBank.map((card) => {
                        const color =
                          card.color ??
                          ROLE_FALLBACK_COLORS[card.role] ??
                          ROLE_FALLBACK_COLORS.other;
                        const used = placedIds.has(card.id);
                        const roleLocked = lockedRoles.has(card.role);
                        return (
                          <WordPuzzleCard
                            key={card.id}
                            card={card}
                            color={color}
                            selected={selectedWordId === card.id}
                            disabled={used || roundBuildComplete || roleLocked}
                            onSelect={() => {
                              if (used || roundBuildComplete || roleLocked) return;
                              playSfx("tap", muted);
                              setSelectedWordId((prev) =>
                                prev === card.id ? null : card.id,
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeLayer.type === "workbench" ? (
              <div className="space-y-3 rounded-xl border border-teal-100 bg-white/70 p-2.5 sm:p-3">
                {parsed.body_text ? (
                  <p className="text-xs font-semibold text-slate-600">
                    {parsed.body_text}
                  </p>
                ) : null}
                {renderWorkbenchElements(activeLayer.elements)}
              </div>
            ) : null}

            {passed && parsed.completion_message ? (
              <p className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-900">
                {parsed.completion_message}
              </p>
            ) : null}
          </div>

          {showReference && parsed.reference ? (
            <aside className="lif-rail rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white p-3 shadow-sm sm:p-4">
              {!referenceInteractive && generalHint ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-amber-700">
                      Grammar tip
                    </p>
                    <h3 className="mt-1 text-[clamp(1.25rem,4cqi,1.75rem)] font-black leading-tight text-slate-900">
                      {generalHint.title}
                    </h3>
                    {generalHint.body ? (
                      <p className="mt-2 text-sm font-bold leading-snug text-slate-700 sm:text-base">
                        {renderInlineBold(generalHint.body, morphology)}
                      </p>
                    ) : null}
                  </div>
                  {generalHint.items.length > 0 ? (
                    <ul className="space-y-2">
                      {generalHint.items.map((item) => (
                        <ReferenceMeaningItem
                          key={item.id}
                          item={item}
                          morphology={morphology}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : activeFocusPanel ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-amber-700">
                      Grammar tip
                    </p>
                    <h3 className="mt-1 text-[clamp(1.25rem,4cqi,1.75rem)] font-black leading-tight text-slate-900">
                      {renderGrammarPhrase(activeFocusPanel.title, morphology)}
                    </h3>
                    {activeFocusPanel.body ? (
                      <p className="mt-2 text-sm font-bold leading-snug text-slate-700 sm:text-base">
                        {renderInlineBold(activeFocusPanel.body, morphology)}
                      </p>
                    ) : null}
                  </div>
                  {activeFocusPanel.items.length > 0 ? (
                    <ul className="space-y-2">
                      {activeFocusPanel.items.map((item) => (
                        <ReferenceMeaningItem
                          key={item.id}
                          item={item}
                          morphology={morphology}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : referenceInteractive && focusPanels.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-[clamp(1.15rem,3.6cqi,1.5rem)] font-black leading-tight text-slate-900">
                    Grammar helper
                  </h3>
                  <p className="text-sm font-bold leading-snug text-slate-700 sm:text-base">
                    {parsed.reference.intro?.trim()
                      ? renderInlineBold(parsed.reference.intro, morphology)
                      : "Tap a word in the sentence to see the grammar tip."}
                  </p>
                  <ul className="space-y-2">
                    {parsed.chunks.map((chunk) => {
                      const panel = focusPanels.find((p) => p.role === chunk.role);
                      if (!panel) return null;
                      const color =
                        chunk.color ??
                        ROLE_FALLBACK_COLORS[chunk.role] ??
                        ROLE_FALLBACK_COLORS.other;
                      const showHint = hintGrammarRole === chunk.role;
                      return (
                        <li key={chunk.id}>
                          <button
                            type="button"
                            className={`flex w-full items-center gap-3 rounded-xl border-2 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                              showHint ? "lif-hint-pulse-amber" : ""
                            }`}
                            style={{ borderColor: color }}
                            onClick={() => selectFocusRole(chunk.role)}
                          >
                            <span
                              className="text-[clamp(1rem,3cqi,1.25rem)] font-black"
                              style={{ color }}
                            >
                              {panel.title}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="space-y-3">
                  {parsed.reference.tips?.map((tip) => (
                    <div key={tip.id} className="flex gap-2">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white"
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                          <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5Zm0 2.2 6.2 3.3-6.2 3.3-6.2-3.3L12 4.7Zm-7 5.2 6.2 3.3v6.6L5 16.5V9.9Zm8.8 9.9v-6.6l6.2-3.3v6.6l-6.2 3.3Z" />
                        </svg>
                      </span>
                      <p className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-bold leading-snug text-slate-800">
                        {renderInlineBold(tip.text, morphology)}
                      </p>
                    </div>
                  ))}

                  {parsed.reference.key_rule ? (
                    <div className="rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-3">
                      <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-sky-700">
                        Key rule
                      </p>
                      <p className="mt-1 text-base font-black text-slate-800">
                        {renderInlineBold(parsed.reference.key_rule.text, morphology)}
                      </p>
                    </div>
                  ) : null}

                  {parsed.reference.compare ? (
                    <div>
                      <p className="text-base font-black text-slate-800">
                        {parsed.reference.compare.title ?? "Compare"}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {parsed.reference.compare.rows.map((row) => (
                          <li
                            key={row.id}
                            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-base font-bold text-slate-700"
                          >
                            <span>{row.base}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-black text-sky-700">{row.form}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {parsed.reference.footer_tip ? (
                    <p className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-bold text-slate-800">
                      {parsed.reference.footer_tip}
                    </p>
                  ) : null}
                </div>
              )}
            </aside>
          ) : null}
        </div>

        <GuideBlock guide={parsed.guide} />
      </section>

      <InteractionLessonNav
        passed={passed || activityComplete}
        onNext={onNext}
        onBack={onBack}
        showBack={showBack}
      />
    </div>
  );
}

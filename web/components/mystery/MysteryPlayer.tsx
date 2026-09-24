"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { EvidenceTray } from "@/components/mystery/EvidenceTray";
import { MysteryScene } from "@/components/mystery/MysteryScene";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { mysteryConditionsMet } from "@/lib/mystery/conditions";
import {
  createInitialMysteryState,
  mysteryStateReducer,
  type MysteryRuntimeAction,
} from "@/lib/mystery/state";
import {
  clearStoredMysteryState,
  readStoredMysteryState,
  writeStoredMysteryState,
} from "@/lib/mystery/storage";
import type {
  MysteryDefinition,
  MysteryHotspotDefinition,
  MysteryPlayerState,
} from "@/lib/mystery/types";

export function MysteryPlayer({ definition }: { definition: MysteryDefinition }) {
  const [state, dispatch] = useReducer(
    (current: MysteryPlayerState, action: MysteryRuntimeAction) =>
      mysteryStateReducer(definition, current, action),
    definition,
    createInitialMysteryState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const saved = readStoredMysteryState(definition);
    if (saved) dispatch({ type: "hydrate", state: saved });
    // Hydration is intentionally a one-time client storage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [definition]);

  useEffect(() => {
    if (hydrated) writeStoredMysteryState(state);
  }, [hydrated, state]);

  const scene =
    definition.scenes.find(
      (candidate) => candidate.id === state.currentSceneId,
    ) ?? definition.scenes[0]!;
  const discoveredClueIds = useMemo(
    () => new Set(state.discoveredClueIds),
    [state.discoveredClueIds],
  );
  const inspectedHotspotIds = useMemo(
    () => new Set(state.inspectedHotspotIds),
    [state.inspectedHotspotIds],
  );
  const availableHotspotIds = useMemo(
    () =>
      new Set(
        scene.hotspots
          .filter((hotspot) => mysteryConditionsMet(hotspot.conditions, state))
          .map((hotspot) => hotspot.id),
      ),
    [scene.hotspots, state],
  );
  const allCluesFound =
    state.discoveredClueIds.length === definition.clues.length;

  function activateHotspot(hotspot: MysteryHotspotDefinition) {
    const action = hotspot.action;
    if (!mysteryConditionsMet(hotspot.conditions, state)) return;

    if (action.type === "discover_clue") {
      const clue = definition.clues.find(
        (candidate) => candidate.id === action.clueId,
      );
      const prefix = discoveredClueIds.has(action.clueId)
        ? "Evidence reviewed: "
        : "Evidence collected: ";
      setFeedback(
        action.text ??
          (clue
            ? prefix + clue.title + ". " + clue.description
            : "Evidence collected."),
      );
    } else if (action.type === "inspect") {
      setFeedback(action.text);
    } else if (action.type === "change_scene") {
      setFeedback(action.text ?? "You moved to a new scene.");
    } else if (action.type === "open_character") {
      setFeedback(
        action.text ??
          "This interview is ready for the next investigation phase.",
      );
    } else {
      setFeedback(action.text ?? "Something in the investigation changed.");
    }

    dispatch({
      type: "hotspot_activated",
      hotspotId: hotspot.id,
      action,
    });
  }

  function resetProgress() {
    if (
      !window.confirm(
        "Reset this case and remove the saved clues from this device?",
      )
    ) {
      return;
    }
    clearStoredMysteryState(definition.id);
    dispatch({ type: "reset" });
    setFeedback(null);
  }

  if (!hydrated) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[linear-gradient(180deg,#e8f6fd_0%,#fff8dc_100%)] p-6">
        <p className="text-lg font-extrabold text-kid-ink">
          Opening case file…
        </p>
      </main>
    );
  }

  if (state.phase === "intro") {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff7c7_0%,#dff3ff_45%,#b8e8fb_100%)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl items-center">
          <KidPanel className="w-full overflow-hidden p-0">
            <div className="border-b-4 border-kid-ink bg-kid-ink px-5 py-4 text-white sm:px-8">
              <Link
                href="/pilots"
                className="inline-flex items-center gap-1 text-sm font-extrabold text-white/80 hover:text-white hover:underline"
              >
                <ArrowLeft aria-hidden className="size-4" /> Pilots
              </Link>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.22em] text-kid-cta">
                {definition.intro.eyebrow ?? "New case"}
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-4xl">
                {definition.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/75 sm:text-base">
                {definition.description}
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[1.2fr_0.8fr]">
              <section>
                <h2 className="text-lg font-extrabold text-kid-ink">
                  What happened?
                </h2>
                <div className="mt-3 space-y-3 text-base font-semibold leading-relaxed text-kid-ink/80">
                  {definition.intro.setup.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border-2 border-kid-ink bg-kid-cta/45 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/55">
                    Mission
                  </p>
                  <p className="mt-1 font-extrabold text-kid-ink">
                    {definition.intro.mission}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-surface-muted p-4">
                <BookOpenCheck aria-hidden className="size-8 text-kid-ink" />
                <h2 className="mt-2 font-extrabold text-kid-ink">
                  Detective goal
                </h2>
                <p className="mt-1 text-sm font-semibold text-kid-ink/75">
                  {definition.learning.objective}
                </p>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-kid-ink/70">
                  {definition.learning.successCriteria.map((criterion) => (
                    <li key={criterion} className="flex gap-2">
                      <span
                        aria-hidden
                        className="font-black text-kid-accent-active"
                      >
                        ✓
                      </span>
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-kid-ink/45">
                  {definition.learning.gradeBand}
                  {definition.learning.cefr
                    ? " · " + definition.learning.cefr
                    : ""}
                  {" · About " + definition.estimatedMinutes + " minutes"}
                </p>
              </section>
            </div>

            <div className="flex justify-center border-t-2 border-kid-ink/10 bg-white px-5 py-5">
              <KidButton onClick={() => dispatch({ type: "start" })}>
                Begin investigation
              </KidButton>
            </div>
          </KidPanel>
        </div>
      </main>
    );
  }

  return (
    <main
      data-student-shell
      className="min-h-dvh bg-[linear-gradient(180deg,#e8f6fd_0%,#fff8dc_100%)] px-3 py-3 sm:px-5 sm:py-5"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-4 border-kid-ink bg-kid-panel px-4 py-3 shadow-[4px_4px_0_0_var(--kid-shadow)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-kid-ink/50">
              <Search aria-hidden className="size-4" /> Mystery investigation
            </div>
            <h1 className="truncate text-xl font-black text-kid-ink sm:text-2xl">
              {definition.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-2 border-kid-ink bg-kid-cta px-3 py-2 text-sm font-extrabold text-kid-ink">
              Clues {state.discoveredClueIds.length}/{definition.clues.length}
            </span>
            <button
              type="button"
              onClick={resetProgress}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-kid-ink/35 bg-white px-3 text-sm font-bold text-kid-ink hover:border-kid-ink"
            >
              <RotateCcw aria-hidden className="size-4" /> Reset
            </button>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)]">
          <div className="min-w-0 space-y-4">
            <MysteryScene
              scene={scene}
              availableHotspotIds={availableHotspotIds}
              inspectedHotspotIds={inspectedHotspotIds}
              onHotspotActivate={activateHotspot}
            />

            <KidPanel
              role="status"
              aria-live="polite"
              className={
                allCluesFound
                  ? "border-emerald-800 bg-emerald-50 shadow-[4px_4px_0_0_#166534]"
                  : "bg-white"
              }
            >
              <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/50">
                Detective notes
              </p>
              <p className="mt-1 font-bold text-kid-ink">
                {allCluesFound
                  ? "Excellent investigating! You found every scene clue. Put them in time order and explain what might have happened."
                  : feedback ??
                    "Choose a yellow marker to inspect the classroom. Not every object is useful evidence."}
              </p>
            </KidPanel>
          </div>

          <div className="min-h-[26rem] lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)]">
            <EvidenceTray
              clues={definition.clues}
              discoveredClueIds={discoveredClueIds}
            />
          </div>
        </div>

        <nav
          aria-label="Mystery stages"
          className="grid grid-cols-3 overflow-hidden rounded-xl border-4 border-kid-ink bg-white text-[11px] font-extrabold text-kid-ink shadow-[4px_4px_0_0_var(--kid-shadow)] sm:text-sm"
        >
          <span className="flex min-h-14 items-center justify-center gap-2 bg-kid-cta px-2 sm:px-3">
            <Search aria-hidden className="size-4" /> Explore
          </span>
          <span
            aria-disabled
            className="flex min-h-14 items-center justify-center gap-2 border-l-2 border-kid-ink/20 px-2 text-kid-ink/40 sm:px-3"
          >
            <Users aria-hidden className="size-4" /> Interviews · Phase 2
          </span>
          <span
            aria-disabled
            className="flex min-h-14 items-center justify-center gap-2 border-l-2 border-kid-ink/20 px-2 text-kid-ink/40 sm:px-3"
          >
            <BookOpenCheck aria-hidden className="size-4" /> Accuse · Phase 2
          </span>
        </nav>
      </div>
    </main>
  );
}

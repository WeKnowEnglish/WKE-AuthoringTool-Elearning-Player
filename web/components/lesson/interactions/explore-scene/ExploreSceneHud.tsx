"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";
import type { ExploreSceneInteractTarget } from "@/lib/explore/explore-scene-engine";
import type { ExploreSceneRunState } from "@/lib/explore/explore-scene-engine";
import { isChecklistComplete } from "@/lib/explore/explore-scene-engine";
import { getWordDisplayInfo } from "@/lib/word-collection";

type Props = {
  scene: ExploreSceneDefinition;
  state: ExploreSceneRunState;
  zoneLabel: string | null;
  interactTarget: ExploreSceneInteractTarget | null;
  showHint: boolean;
  onDismissHint: () => void;
  onInteract: () => void;
};

export function ExploreSceneHud({
  scene,
  state,
  zoneLabel,
  interactTarget,
  showHint,
  onDismissHint,
  onInteract,
}: Props) {
  const complete = isChecklistComplete(scene, state);
  const wordTotal = scene.wordPickups.length;
  const materialTotal = scene.materialPickups.length;
  const wordsFound = state.collectedWordIds.length;
  const materialsFound = state.collectedMaterialIds.length;

  let interactLabel = "Interact";
  if (interactTarget?.kind === "word") {
    interactLabel = `Check ${interactTarget.objectLabel}`;
  } else if (interactTarget?.kind === "material") {
    interactLabel = `Get ${interactTarget.label}`;
  } else if (interactTarget?.kind === "brother") {
    interactLabel = "Help brother";
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t-4 border-kid-ink bg-white/95 px-2 py-2 sm:px-3">
      {showHint ?
        <p className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs font-bold text-amber-950 sm:text-sm">
          Use the doors to visit the kitchen and bedroom. Walk near objects and tap Interact.{" "}
          <button
            type="button"
            className="underline"
            onClick={onDismissHint}
          >
            Got it
          </button>
        </p>
      : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
            {zoneLabel ?? "Home"}
          </p>
          <p className="text-sm font-bold text-kid-ink">
            Words {wordsFound}/{wordTotal} · Things {materialsFound}/{materialTotal}
            {complete ?
              <span className="ml-1 text-emerald-700"> — Ready!</span>
            : null}
          </p>
        </div>
        <KidButton
          type="button"
          variant="accent"
          className="!min-h-10 shrink-0 px-4 text-sm"
          disabled={!interactTarget}
          onClick={() => {
            onDismissHint();
            onInteract();
          }}
        >
          {interactLabel}
        </KidButton>
      </div>

      <KidPanel className="max-h-24 overflow-y-auto p-2 text-xs font-semibold text-kid-ink">
        <p className="mb-1 font-extrabold">Brother needs</p>
        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 sm:grid-cols-3">
          {scene.wordPickups.map((p) => {
            const done = state.collectedWordIds.includes(p.wordId);
            const label = getWordDisplayInfo(p.wordId)?.displayLabel ?? p.objectLabel;
            return (
              <li
                key={p.pickupId}
                className={clsx(done && "text-emerald-700 line-through decoration-2")}
              >
                {done ? "✓ " : "○ "}
                {label}
              </li>
            );
          })}
          {scene.materialPickups.map((p) => {
            const done = state.collectedMaterialIds.includes(p.materialId);
            return (
              <li
                key={p.pickupId}
                className={clsx(done && "text-emerald-700 line-through decoration-2")}
              >
                {done ? "✓ " : "○ "}
                {p.label}
              </li>
            );
          })}
        </ul>
      </KidPanel>
    </div>
  );
}

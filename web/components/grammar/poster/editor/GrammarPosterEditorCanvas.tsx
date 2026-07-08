"use client";



import type { PosterModuleView } from "@/lib/grammar-builder/map-poster-module";

import type { GrammarInteraction } from "@/lib/grammar-builder/schema";

import type { GrammarModuleIssue } from "@/lib/grammar-builder/validate-module";

import type { InteractionTargetKey } from "@/lib/grammar-builder/interactions/resolve-interaction-target";

import type { PosterInteractionMode } from "../interactions/PosterInteractionContext";

import { GrammarPosterInteractiveContent } from "../GrammarPosterInteractiveContent";



type Props = {

  view: PosterModuleView;

  interactions?: GrammarInteraction[];

  interactionMode?: PosterInteractionMode;

  pickTargetMode?: boolean;

  pickedTargetKey?: InteractionTargetKey | null;

  onPickTarget?: (targetKey: InteractionTargetKey) => void;

  previewMode: boolean;

  selectedCardId: number | null;

  onSelectCard?: (cardId: number) => void;

  validationIssues: GrammarModuleIssue[];

  showValidationBanner: boolean;

  cardIds?: number[];

};



export function GrammarPosterEditorCanvas({

  view,

  interactions,

  interactionMode = "off",

  pickTargetMode = false,

  pickedTargetKey = null,

  onPickTarget,

  previewMode,

  selectedCardId,

  onSelectCard,

  validationIssues,

  showValidationBanner,

  cardIds,

}: Props) {

  const resolvedMode: PosterInteractionMode =

    previewMode ? "play" : interactionMode;



  return (

    <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-kid-ink/20 bg-white/60 p-3 sm:p-4">

      {showValidationBanner ?

        <div

          className="mb-3 rounded-xl border-2 border-amber-500/50 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"

          role="status"

        >

          Fix {validationIssues.length} validation{" "}

          {validationIssues.length === 1 ? "error" : "errors"} to update the preview.

        </div>

      : null}



      {pickTargetMode ?

        <p className="mb-3 rounded-xl border-2 border-kid-cta/40 bg-kid-cta/20 px-3 py-2 text-sm font-semibold text-kid-ink">

          Click a dashed region on the poster to pick an interaction target.

        </p>

      : null}



      <GrammarPosterInteractiveContent

        view={{ ...view, interactions: interactions ?? view.interactions }}

        interactions={interactions ?? view.interactions}

        interactionMode={resolvedMode}

        pickTargetMode={pickTargetMode}

        pickedTargetKey={pickedTargetKey}

        onPickTarget={onPickTarget}

        cardIds={cardIds}

        editable={

          previewMode || !onSelectCard ?

            selectedCardId !== null ?

              { selectedCardId }

            : undefined

          : {

              selectedCardId,

              onSelectCard,

            }

        }

      />

    </div>

  );

}


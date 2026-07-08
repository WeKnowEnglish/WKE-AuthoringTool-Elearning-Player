"use client";



import type { PosterModuleView } from "@/lib/grammar-builder/map-poster-module";

import type { GrammarInteraction } from "@/lib/grammar-builder/schema";

import type { InteractionTargetKey } from "@/lib/grammar-builder/interactions/resolve-interaction-target";

import { PosterContent } from "./PosterContent";

import { PosterInteractionProvider } from "./interactions/PosterInteractionContext";



type Props = {

  view: PosterModuleView;

  interactions?: GrammarInteraction[];

  interactionMode?: "off" | "play" | "author";

  pickTargetMode?: boolean;

  pickedTargetKey?: InteractionTargetKey | null;

  onPickTarget?: (targetKey: InteractionTargetKey) => void;

  muted?: boolean;

  cardIds?: number[];

  editable?: {

    selectedCardId?: number | null;

    onSelectCard?: (cardId: number) => void;

  };

};



export function GrammarPosterInteractiveContent({

  view,

  interactions,

  interactionMode = "play",

  pickTargetMode = false,

  pickedTargetKey = null,

  onPickTarget,

  muted,

  cardIds,

  editable,

}: Props) {

  return (

    <PosterInteractionProvider

      interactions={interactions ?? view.interactions}

      mode={interactionMode}

      muted={muted}

      pickTargetMode={pickTargetMode}

      pickedTargetKey={pickedTargetKey}

      onPickTarget={onPickTarget}

    >

      <PosterContent

        hero={view.hero}

        sections={view.sections}

        pageLayout={view.pageLayout}

        customRows={view.customRows}

        cardIds={cardIds}

        variant="poster"

        editable={editable}

      />

    </PosterInteractionProvider>

  );

}


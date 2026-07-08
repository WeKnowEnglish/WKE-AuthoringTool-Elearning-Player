"use client";



import {

  createContext,

  useCallback,

  useContext,

  useMemo,

  useState,

  type ReactNode,

} from "react";

import type { GrammarInteraction } from "@/lib/grammar-builder/schema";

import {

  indexInteractionsByTarget,

  interactionTargetKey,

  type InteractionTargetKey,

} from "@/lib/grammar-builder/interactions/resolve-interaction-target";

import { playPosterAudio } from "@/lib/audio/play-poster-audio";

import { playSfx } from "@/lib/audio/sfx";



export type PosterInteractionMode = "off" | "play" | "author";



type PosterInteractionContextValue = {

  mode: PosterInteractionMode;

  pickTargetMode: boolean;

  pickedTargetKey: InteractionTargetKey | null;

  onPickTarget?: (targetKey: InteractionTargetKey) => void;

  getInteractions: (targetKey: InteractionTargetKey) => GrammarInteraction[];

  isRevealed: (interactionId: string) => boolean;

  getToggleState: (interactionId: string) => "a" | "b";

  isHighlighted: (interactionId: string) => boolean;

  triggerTarget: (targetKey: InteractionTargetKey) => void;

  muted?: boolean;

};



const PosterInteractionContext = createContext<PosterInteractionContextValue | null>(null);



export function usePosterInteractions(): PosterInteractionContextValue | null {

  return useContext(PosterInteractionContext);

}



type ProviderProps = {

  interactions?: GrammarInteraction[];

  mode: PosterInteractionMode;

  muted?: boolean;

  pickTargetMode?: boolean;

  pickedTargetKey?: InteractionTargetKey | null;

  onPickTarget?: (targetKey: InteractionTargetKey) => void;

  children: ReactNode;

};



export function PosterInteractionProvider({

  interactions,

  mode,

  muted = false,

  pickTargetMode = false,

  pickedTargetKey = null,

  onPickTarget,

  children,

}: ProviderProps) {

  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());

  const [toggleStates, setToggleStates] = useState<Map<string, "a" | "b">>(() => new Map());

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());



  const byTarget = useMemo(() => indexInteractionsByTarget(interactions), [interactions]);



  const getInteractions = useCallback(

    (targetKey: InteractionTargetKey) => byTarget.get(targetKey) ?? [],

    [byTarget],

  );



  const triggerTarget = useCallback(

    (targetKey: InteractionTargetKey) => {

      if (mode === "off") {

        return;

      }



      const items = byTarget.get(targetKey) ?? [];

      if (items.length === 0) {

        return;

      }



      if (mode === "play") {

        playSfx("tap", muted);

      }



      for (const interaction of items) {

        if (interaction.action === "reveal") {

          setRevealedIds((prev) => new Set(prev).add(interaction.id));

          if (mode === "play") {

            playSfx("correct", muted);

          }

        }



        if (interaction.action === "toggle") {

          setToggleStates((prev) => {

            const next = new Map(prev);

            const current = next.get(interaction.id) ?? interaction.payload.initial;

            next.set(interaction.id, current === "a" ? "b" : "a");

            return next;

          });

        }



        if (interaction.action === "highlight") {

          setHighlightedIds((prev) => new Set(prev).add(interaction.id));

          const duration = interaction.payload.durationMs ?? 900;

          if (!interaction.payload.sticky) {

            window.setTimeout(() => {

              setHighlightedIds((prev) => {

                const next = new Set(prev);

                next.delete(interaction.id);

                return next;

              });

            }, duration);

          }

        }



        if (interaction.action === "play-audio") {

          if (mode === "play") {

            playPosterAudio(interaction.payload.text, {

              lang: interaction.payload.lang,

              muted,

            });

          }

        }

      }

    },

    [byTarget, mode, muted],

  );



  const value = useMemo<PosterInteractionContextValue>(

    () => ({

      mode,

      pickTargetMode,

      pickedTargetKey,

      onPickTarget,

      getInteractions,

      isRevealed: (id) => revealedIds.has(id),

      getToggleState: (id) => toggleStates.get(id) ?? "a",

      isHighlighted: (id) => highlightedIds.has(id),

      triggerTarget,

      muted,

    }),

    [

      mode,

      pickTargetMode,

      pickedTargetKey,

      onPickTarget,

      getInteractions,

      revealedIds,

      toggleStates,

      highlightedIds,

      triggerTarget,

      muted,

    ],

  );



  return (

    <PosterInteractionContext.Provider value={value}>{children}</PosterInteractionContext.Provider>

  );

}



export { interactionTargetKey };


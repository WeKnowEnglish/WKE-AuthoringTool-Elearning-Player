"use client";



import { clsx } from "clsx";

import { AnimatePresence, motion } from "motion/react";

import type { ReactNode } from "react";

import type { GrammarInteraction } from "@/lib/grammar-builder/schema";

import {

  interactionTargetKey,

  type InteractionTargetKey,

} from "@/lib/grammar-builder/interactions/resolve-interaction-target";

import { usePosterInteractions } from "./PosterInteractionContext";



type Props = {

  cardId: number;

  region: GrammarInteraction["target"]["region"];

  itemIndex?: number;

  rowIndex?: number;

  colIndex?: number;

  children: ReactNode;

  className?: string;

};



function RevealContent({ interaction }: { interaction: GrammarInteraction & { action: "reveal" } }) {

  return (

    <motion.div

      initial={{ opacity: 0, height: 0 }}

      animate={{ opacity: 1, height: "auto" }}

      exit={{ opacity: 0, height: 0 }}

      className="overflow-hidden"

      role="status"

    >

      <p className="mt-2 rounded-lg border-2 border-dashed border-kid-ink/25 bg-white/80 px-2 py-1.5 text-base font-semibold text-kid-ink">

        {interaction.payload.label ?

          <span className="mr-2 text-xs font-extrabold uppercase text-kid-ink/50">

            {interaction.payload.label}:

          </span>

        : null}

        {interaction.payload.text}

      </p>

    </motion.div>

  );

}



export function PosterInteractiveTarget({

  cardId,

  region,

  itemIndex,

  rowIndex,

  colIndex,

  children,

  className,

}: Props) {

  const ctx = usePosterInteractions();

  const targetKey: InteractionTargetKey = interactionTargetKey({

    cardId,

    region,

    itemIndex,

    rowIndex,

    colIndex,

  });

  const interactions = ctx?.getInteractions(targetKey) ?? [];

  const isPickMode = ctx?.mode === "author" && ctx.pickTargetMode;

  const isInteractive = interactions.length > 0 && ctx?.mode !== "off";

  const isAuthor = ctx?.mode === "author" && !isPickMode;

  const isPlay = ctx?.mode === "play";

  const isPicked = isPickMode && ctx?.pickedTargetKey === targetKey;

  const hasPlayAudio = interactions.some((item) => item.action === "play-audio");



  const revealInteractions = interactions.filter(

    (item): item is GrammarInteraction & { action: "reveal" } => item.action === "reveal",

  );

  const toggleInteractions = interactions.filter(

    (item): item is GrammarInteraction & { action: "toggle" } => item.action === "toggle",

  );

  const revealedContent = revealInteractions.filter((item) => ctx?.isRevealed(item.id));

  const hasUnrevealed = revealInteractions.some((item) => !ctx?.isRevealed(item.id));

  const isHighlighted = interactions.some((item) => ctx?.isHighlighted(item.id));



  function handleActivate() {

    if (isPickMode) {

      ctx?.onPickTarget?.(targetKey);

      return;

    }

    if (!isInteractive) {

      return;

    }

    ctx?.triggerTarget(targetKey);

  }



  if (!ctx || (interactions.length === 0 && !isPickMode)) {

    return <div className={className}>{children}</div>;

  }



  return (

    <div

      className={clsx(

        className,

        isPickMode && "cursor-pointer rounded-lg transition-shadow",

        isPickMode && !isPicked && "outline outline-1 outline-dashed outline-kid-ink/25",

        isPicked && "ring-2 ring-kid-cta ring-offset-1",

        isInteractive && isPlay && "cursor-pointer rounded-xl transition-shadow",

        isHighlighted && "ring-4 ring-sun-gold ring-offset-2",

        isInteractive && isPlay && hasUnrevealed && "underline decoration-dotted decoration-kid-ink/40",

      )}

      role={isPlay || isPickMode ? "button" : undefined}

      tabIndex={isPlay || isPickMode ? 0 : undefined}

      aria-expanded={revealInteractions.length > 0 ? revealedContent.length > 0 : undefined}

      aria-label={

        isPickMode ? "Select interaction target"

        : isPlay && hasUnrevealed ? "Tap to reveal more information"

        : isPlay && hasPlayAudio ? "Tap to play audio"

        : undefined

      }

      onClick={

        isPlay || isPickMode ?

          (event) => {

            event.stopPropagation();

            handleActivate();

          }

        : undefined

      }

      onKeyDown={

        isPlay || isPickMode ?

          (event) => {

            if (event.key === "Enter" || event.key === " ") {

              event.preventDefault();

              event.stopPropagation();

              handleActivate();

            }

          }

        : undefined

      }

    >

      {isAuthor ?

        <span className="mb-1 inline-flex rounded-md border border-kid-ink/20 bg-kid-cta/40 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-kid-ink/70">

          {interactions.map((item) => item.action).join(" + ")}

        </span>

      : null}

      {isPickMode ?

        <span className="mb-0.5 block text-[10px] font-bold uppercase text-kid-ink/40">

          {isPicked ? "Selected target" : "Click to pick"}

        </span>

      : null}

      {isPlay && hasUnrevealed ?

        <span className="mb-0.5 block text-xs font-bold text-kid-ink/45">Tap to explore</span>

      : null}

      {isPlay && !hasUnrevealed && hasPlayAudio ?

        <span className="mb-0.5 block text-xs font-bold text-kid-ink/45" aria-hidden>

          🔊 Tap to listen

        </span>

      : null}

      {children}

      <AnimatePresence>

        {revealedContent.map((interaction) => (

          <RevealContent key={interaction.id} interaction={interaction} />

        ))}

      </AnimatePresence>

      {toggleInteractions.map((interaction) => {

        const state = ctx?.getToggleState(interaction.id) ?? interaction.payload.initial;

        const text =

          state === "a" ? interaction.payload.textA : interaction.payload.textB;

        return (

          <p

            key={interaction.id}

            className="mt-2 rounded-lg border-2 border-kid-ink/15 bg-white/70 px-2 py-1.5 text-base font-semibold text-kid-ink"

          >

            {text}

          </p>

        );

      })}

    </div>

  );

}


"use client";

import type { ReactNode } from "react";
import type { GrammarInteractionRegion } from "@/lib/grammar-builder/schema";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";

type Props = {
  example: ReactNode;
  cardId?: number;
  region?: GrammarInteractionRegion;
  itemIndex?: number;
};

export function PosterInteractiveExample({
  example,
  cardId,
  region,
  itemIndex,
}: Props) {
  if (cardId === undefined || region === undefined) {
    return <>{example}</>;
  }

  return (
    <PosterInteractiveTarget cardId={cardId} region={region} itemIndex={itemIndex}>
      {example}
    </PosterInteractiveTarget>
  );
}

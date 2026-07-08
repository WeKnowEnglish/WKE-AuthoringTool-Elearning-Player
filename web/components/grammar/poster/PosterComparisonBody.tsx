import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";

import type { PosterComparisonSide } from "./poster-view-model";

import type { GrammarPosterVariant } from "./poster-variant";



type Props = {

  cardId: number;

  left: PosterComparisonSide;

  right: PosterComparisonSide;

  variant?: GrammarPosterVariant;

};



function ComparisonColumn({

  cardId,

  side,

  region,

  variant,

  bordered,

}: {

  cardId: number;

  side: PosterComparisonSide;

  region: "leftColumn" | "rightColumn";

  variant: GrammarPosterVariant;

  bordered?: boolean;

}) {

  const titleClass =

    variant === "poster" ?

      "mb-2 text-xs font-extrabold uppercase text-kid-ink md:text-sm"

    : "mb-2 text-xs font-extrabold uppercase text-kid-ink";

  const itemClass =

    variant === "poster" ?

      "text-base font-bold text-kid-ink md:text-lg"

    : "text-xs font-bold text-kid-ink";



  return (

    <PosterInteractiveTarget cardId={cardId} region={region}>

      <div className={bordered ? "sm:border-r-2 sm:border-dashed sm:border-kid-ink/30 sm:pr-4" : "sm:pl-1"}>

        <p className={titleClass}>

          {side.badge ? (

            <span className="mr-1" aria-hidden>

              {side.badge}

            </span>

          ) : null}

          {side.title}

        </p>

        {side.items.map((item, i) => (

          <PosterInteractiveTarget

            key={i}

            cardId={cardId}

            region={region}

            itemIndex={i}

          >

            <p className={itemClass}>

              {item.emoji ? (

                <span aria-hidden>{item.emoji} </span>

              ) : null}

              {item.sentence}

            </p>

          </PosterInteractiveTarget>

        ))}

      </div>

    </PosterInteractiveTarget>

  );

}



export function PosterComparisonBody({ cardId, left, right, variant = "poster" }: Props) {

  return (

    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">

      <ComparisonColumn cardId={cardId} side={left} region="leftColumn" variant={variant} bordered />

      <ComparisonColumn cardId={cardId} side={right} region="rightColumn" variant={variant} />

    </div>

  );

}


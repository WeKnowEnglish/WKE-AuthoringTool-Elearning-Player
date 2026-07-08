import { Fragment } from "react";

import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";

import type { PosterSummaryCell, PosterSummaryGrid as PosterSummaryGridData } from "./poster-view-model";

import type { GrammarPosterVariant } from "./poster-variant";



type Props = {

  cardId: number;

  grid: PosterSummaryGridData;

  variant?: GrammarPosterVariant;

  accentColor?: string;

};



function renderMark(cell: PosterSummaryCell, accentColor: string) {

  switch (cell.mark) {

    case "check":

      return (

        <span className="font-extrabold" style={{ color: accentColor }} aria-label="yes">

          ✓

        </span>

      );

    case "cross":

      return (

        <span className="font-extrabold text-kid-ink/70" aria-label="no">

          ✗

        </span>

      );

    case "dash":

      return <span className="font-bold text-kid-ink/50">—</span>;

    case "text":

      return (

        <span className="font-semibold text-kid-ink">

          {cell.graphic ? (

            <span className="mr-1" aria-hidden>

              {cell.graphic}

            </span>

          ) : null}

          {cell.text}

        </span>

      );

    default: {

      const _exhaustive: never = cell.mark;

      return _exhaustive;

    }

  }

}



export function PosterSummaryGrid({

  cardId,

  grid,

  variant = "poster",

  accentColor = "#1d4ed8",

}: Props) {

  const headerClass =

    variant === "poster" ?

      "text-xs font-extrabold uppercase tracking-wide text-kid-ink md:text-sm"

    : "text-xs font-extrabold uppercase tracking-wide text-kid-ink";

  const rowLabelClass =

    variant === "poster" ?

      "text-sm font-extrabold uppercase text-kid-ink md:text-base"

    : "text-xs font-extrabold uppercase text-kid-ink";

  const cellClass =

    variant === "poster" ?

      "text-base font-semibold md:text-lg"

    : "text-sm font-semibold";



  return (

    <div className="overflow-x-auto">

      <div

        className="grid min-w-[280px] gap-2"

        style={{

          gridTemplateColumns: `minmax(5rem, 1.2fr) repeat(${grid.columns.length}, minmax(4rem, 1fr))`,

        }}

      >

        <div />

        {grid.columns.map((column) => (

          <div key={column.label} className={headerClass}>

            {column.label}

          </div>

        ))}



        {grid.rows.map((row, rowIndex) => (

          <Fragment key={row.label}>

            <div className={rowLabelClass}>{row.label}</div>

            {row.cells.map((cell, colIndex) => (

              <PosterInteractiveTarget

                key={`${row.label}-${colIndex}`}

                cardId={cardId}

                region="summaryCell"

                rowIndex={rowIndex}

                colIndex={colIndex}

              >

                <div className={cellClass}>{renderMark(cell, accentColor)}</div>

              </PosterInteractiveTarget>

            ))}

          </Fragment>

        ))}

      </div>

    </div>

  );

}


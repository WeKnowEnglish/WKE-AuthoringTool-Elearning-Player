"use client";

import { Fragment } from "react";

import {
  posterInlineEditFieldKey,
  SUMMARY_MARK_OPTIONS,
} from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableSelect } from "./editor/PosterEditableSelect";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";

import type { PosterSummaryCell, PosterSummaryGrid as PosterSummaryGridData } from "./poster-view-model";

import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId: number;
  grid: PosterSummaryGridData;
  variant?: GrammarPosterVariant;
  accentColor?: string;
};

function SummaryCellContent({
  cardId,
  rowIndex,
  colIndex,
  cell,
  accentColor,
  cellClass,
}: {
  cardId: number;
  rowIndex: number;
  colIndex: number;
  cell: PosterSummaryCell;
  accentColor: string;
  cellClass: string;
}) {
  const inlineEdit = usePosterInlineEdit();
  const showSwitchHint =
    inlineEdit?.enabled && inlineEdit.selectedCardId === cardId && cell.mark !== "text";

  const markFieldKey = posterInlineEditFieldKey(cardId, {
    kind: "summaryCell",
    rowIndex,
    colIndex,
    prop: "mark",
  });

  const markDisplay = (() => {
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
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "summaryCell",
                rowIndex,
                colIndex,
                prop: "graphic",
              })}
              value={cell.graphic ?? ""}
              variant="emoji"
              placeholder="📘"
              trimOnCommit={false}
            >
              {cell.graphic ? (
                <span className="mr-1" aria-hidden>
                  {cell.graphic}
                </span>
              ) : null}
            </PosterEditableText>
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "summaryCell",
                rowIndex,
                colIndex,
                prop: "text",
              })}
              value={cell.text ?? ""}
              variant="example-sentence"
              placeholder="Cell text"
            >
              <span>{cell.text}</span>
            </PosterEditableText>
          </span>
        );
      default: {
        const _exhaustive: never = cell.mark;
        return _exhaustive;
      }
    }
  })();

  return (
    <div className={cellClass}>
      <PosterEditableSelect
        cardId={cardId}
        fieldKey={markFieldKey}
        value={cell.mark}
        options={SUMMARY_MARK_OPTIONS}
        ariaLabel="Edit summary cell mark"
      >
        {markDisplay}
      </PosterEditableSelect>
      {showSwitchHint ? (
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-kid-ink/45">
          Switch mark to Text to edit cell content
        </p>
      ) : null}
    </div>
  );
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
    variant === "poster" ? "text-base font-semibold md:text-lg" : "text-sm font-semibold";

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[280px] gap-2"
        style={{
          gridTemplateColumns: `minmax(5rem, 1.2fr) repeat(${grid.columns.length}, minmax(4rem, 1fr))`,
        }}
      >
        <div />
        {grid.columns.map((column, colIndex) => (
          <div key={`${column.label}-${colIndex}`} className={headerClass}>
            <PosterEditableText
              cardId={cardId}
              fieldKey={posterInlineEditFieldKey(cardId, {
                kind: "summaryColumn",
                index: colIndex,
              })}
              value={column.label}
              variant="column-title"
              placeholder="Column"
            >
              <span>{column.label}</span>
            </PosterEditableText>
          </div>
        ))}

        {grid.rows.map((row, rowIndex) => (
          <Fragment key={`${row.label}-${rowIndex}`}>
            <div className={rowLabelClass}>
              <PosterEditableText
                cardId={cardId}
                fieldKey={posterInlineEditFieldKey(cardId, {
                  kind: "summaryRow",
                  index: rowIndex,
                })}
                value={row.label}
                variant="column-title"
                placeholder="Row"
              >
                <span>{row.label}</span>
              </PosterEditableText>
            </div>
            {row.cells.map((cell, colIndex) => (
              <PosterInteractiveTarget
                key={`${row.label}-${colIndex}`}
                cardId={cardId}
                region="summaryCell"
                rowIndex={rowIndex}
                colIndex={colIndex}
              >
                <SummaryCellContent
                  cardId={cardId}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  cell={cell}
                  accentColor={accentColor}
                  cellClass={cellClass}
                />
              </PosterInteractiveTarget>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

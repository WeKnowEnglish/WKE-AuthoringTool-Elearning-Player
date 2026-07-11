"use client";

import { PosterEditableText } from "./editor/PosterEditableText";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  cardId?: number;
  bodyFieldKey?: string;
  highlightFieldKey?: string;
  title: string;
  body: string;
  highlight: string;
  variant?: GrammarPosterVariant;
  hideTitle?: boolean;
  dense?: boolean;
};

export function PosterNoteBox({
  cardId,
  bodyFieldKey,
  highlightFieldKey,
  title,
  body,
  highlight,
  variant = "poster",
  hideTitle = false,
  dense = false,
}: Props) {
  const isShowcase = variant === "showcase";
  const isDensePoster = dense && !isShowcase;
  const editable = cardId != null && bodyFieldKey && highlightFieldKey;

  const bodyContent =
    editable ?
      <PosterEditableText
        cardId={cardId}
        fieldKey={bodyFieldKey}
        value={body}
        variant="body-text"
        placeholder="Banner body text"
      >
        <span>{body}</span>
      </PosterEditableText>
    : body;

  const highlightContent =
    editable ?
      <PosterEditableText
        cardId={cardId}
        fieldKey={highlightFieldKey}
        value={highlight}
        variant="banner-highlight"
        placeholder="Highlight phrase"
      >
        <span>↙ ↘ {highlight}</span>
      </PosterEditableText>
    : <>↙ ↘ {highlight}</>;

  return (
    <div
      className={
        isDensePoster ?
          "rounded-xl border-2 border-kid-ink bg-white p-3 shadow-[3px_3px_0_0_var(--kid-shadow)]"
        : "flex h-full flex-col rounded-xl border-2 border-kid-ink bg-white p-3 shadow-[3px_3px_0_0_var(--kid-shadow)]"
      }
    >
      {!hideTitle ? (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            💡
          </span>
          <h3
            className={
              isShowcase ?
                "text-sm font-extrabold text-kid-ink"
              : "text-lg font-extrabold text-kid-ink"
            }
          >
            {title}
          </h3>
        </div>
      ) : (
        <span className="mb-2 text-xl" aria-hidden>
          💡
        </span>
      )}
      <p
        className={
          isShowcase ?
            "flex-1 text-xs font-semibold leading-relaxed text-kid-ink"
          : isDensePoster ?
            "text-base font-semibold leading-snug text-kid-ink md:text-lg"
          : "flex-1 text-base font-semibold leading-relaxed text-kid-ink md:text-lg"
        }
      >
        {bodyContent}
      </p>
      <div
        className={
          isDensePoster ?
            "mt-2 rounded-full border-2 border-kid-ink bg-kid-cta px-3 py-1.5 text-center shadow-[2px_2px_0_0_var(--kid-shadow)]"
          : "mt-2 rounded-full border-2 border-kid-ink bg-kid-cta px-3 py-2 text-center shadow-[2px_2px_0_0_var(--kid-shadow)]"
        }
      >
        <p
          className={
            isShowcase ?
              "text-[11px] font-extrabold uppercase tracking-wide text-kid-ink"
            : "text-sm font-extrabold uppercase tracking-wide text-kid-ink md:text-base"
          }
        >
          {highlightContent}
        </p>
      </div>
    </div>
  );
}

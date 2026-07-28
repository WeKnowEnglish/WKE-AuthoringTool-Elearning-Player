"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { CardPalette } from "@/lib/grammar-builder/theme-tokens";
import { posterInlineEditFieldKey } from "@/lib/grammar-builder/editor/poster-inline-edit-fields";
import { PosterEditableText } from "./editor/PosterEditableText";
import { usePosterInlineEdit } from "./editor/PosterInlineEditContext";
import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";
import { PosterGlanceRule } from "./PosterGlanceRule";
import type { PosterGlanceRule as PosterGlanceRuleData, PosterSectionColor } from "./poster-view-model";
import { SECTION_COLORS } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  number: number;
  kidTitle: string;
  kidSubtitle?: string;
  chromeAlign?: "left" | "center" | "right";
  /** Showcase fallback when demo cards use author-style titles */
  title?: string;
  glanceRule?: PosterGlanceRuleData;
  color: PosterSectionColor;
  palette?: CardPalette;
  children: ReactNode;
  variant?: GrammarPosterVariant;
};

export function PosterSectionCard({
  number,
  kidTitle,
  kidSubtitle,
  chromeAlign = "center",
  title,
  glanceRule,
  color,
  palette,
  children,
  variant = "poster",
}: Props) {
  const resolvedPalette = palette ?? SECTION_COLORS[color];
  const isShowcase = variant === "showcase";
  const headerTitle = isShowcase ? (title ?? kidTitle) : kidTitle;
  const inlineEdit = usePosterInlineEdit();
  const showInlineSubtitle =
    !isShowcase &&
    (kidSubtitle || (inlineEdit?.enabled && inlineEdit.selectedCardId === number));
  const headerJustify =
    chromeAlign === "left" ? "justify-start"
    : chromeAlign === "right" ? "justify-end"
    : "justify-center";
  const headerTextAlign =
    chromeAlign === "left" ? "text-left"
    : chromeAlign === "right" ? "text-right"
    : "text-center";

  return (
    <section
      className={clsx(
        "relative flex flex-col overflow-hidden rounded-2xl border-2 border-black/80 shadow-[4px_4px_0_0_rgba(0,0,0,0.15)]",
        isShowcase ? "h-full" : "mt-2",
      )}
      style={{
        backgroundColor: resolvedPalette.body,
        borderColor: resolvedPalette.border,
      }}
    >
      <div
        className={
          isShowcase ?
            "flex items-center gap-2 px-3 py-2"
          : clsx("flex items-center gap-3 px-3 py-2 sm:px-4", headerJustify)
        }
        style={{ backgroundColor: resolvedPalette.header }}
      >
        <span
          className={
            isShowcase ?
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-sm font-extrabold text-white"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-extrabold text-white"
          }
          aria-hidden
        >
          {number}
        </span>
        <div className={clsx("min-w-0", isShowcase ? "flex-1" : headerTextAlign)}>
          {isShowcase ?
            <h2 className="text-[11px] font-extrabold uppercase leading-tight text-white sm:text-xs">
              {number}. {headerTitle}
            </h2>
          : <PosterEditableText
              cardId={number}
              fieldKey={posterInlineEditFieldKey(number, { kind: "chrome", field: "kidTitle" })}
              value={kidTitle}
              variant="header-title"
              maxLength={40}
              placeholder="Card title"
            >
              <span className="text-[28px] font-extrabold uppercase leading-snug text-white md:text-[30px]">
                {headerTitle}
              </span>
            </PosterEditableText>
          }
          {showInlineSubtitle ?
            <PosterEditableText
              cardId={number}
              fieldKey={posterInlineEditFieldKey(number, { kind: "chrome", field: "kidSubtitle" })}
              value={kidSubtitle ?? ""}
              variant="header-subtitle"
              maxLength={30}
              placeholder="Subtitle (optional)"
            >
              <span className="text-xs font-bold uppercase leading-tight text-white/90 md:text-sm">
                {kidSubtitle || (
                  <span className="text-white/50">Subtitle (optional)</span>
                )}
              </span>
            </PosterEditableText>
          : null}
        </div>
      </div>
      <div className={isShowcase ? "flex-1 p-3" : "p-3 sm:p-4"}>
        {!isShowcase && glanceRule ?
          <PosterInteractiveTarget cardId={number} region="glanceRule">
            <PosterGlanceRule
              cardId={number}
              text={glanceRule.text}
              highlight={glanceRule.highlight}
              align={glanceRule.align}
            />
          </PosterInteractiveTarget>
        : null}
        {children}
      </div>
    </section>
  );
}

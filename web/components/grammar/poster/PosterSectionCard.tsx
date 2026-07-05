import type { ReactNode } from "react";
import type { CardPalette } from "@/lib/grammar-builder/theme-tokens";
import { PosterGlanceRule } from "./PosterGlanceRule";
import type { PosterGlanceRule as PosterGlanceRuleData, PosterSectionColor } from "./poster-view-model";
import { SECTION_COLORS } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  number: number;
  kidTitle: string;
  kidSubtitle?: string;
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

  return (
    <section
      className={
        isShowcase ?
          "flex h-full flex-col overflow-hidden rounded-2xl border-4 border-kid-ink shadow-[6px_6px_0_0_var(--kid-shadow)]"
        : "flex flex-col overflow-hidden rounded-2xl border-4 border-kid-ink shadow-[6px_6px_0_0_var(--kid-shadow)]"
      }
      style={{ backgroundColor: resolvedPalette.body }}
    >
      <div
        className={
          isShowcase ?
            "flex items-center gap-2 px-3 py-2"
          : "flex items-center gap-3 px-3 py-2 sm:px-4"
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
        <div className="min-w-0">
          <h2
            className={
              isShowcase ?
                "text-[11px] font-extrabold uppercase leading-tight text-white sm:text-xs"
              : "text-sm font-extrabold uppercase leading-snug text-white md:text-base"
            }
          >
            {isShowcase ? `${number}. ${headerTitle}` : headerTitle}
          </h2>
          {!isShowcase && kidSubtitle ? (
            <p className="text-xs font-bold uppercase leading-tight text-white/90 md:text-sm">
              {kidSubtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className={isShowcase ? "flex-1 p-3" : "p-3 sm:p-4"}>
        {!isShowcase && glanceRule ? (
          <PosterGlanceRule text={glanceRule.text} highlight={glanceRule.highlight} />
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function getSectionPillColor(color: PosterSectionColor, palette?: CardPalette) {
  return palette?.pill ?? SECTION_COLORS[color].pill;
}

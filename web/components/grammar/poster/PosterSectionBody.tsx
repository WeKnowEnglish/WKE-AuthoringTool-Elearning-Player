import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";
import { PosterExampleRow } from "./PosterExampleRow";
import { PosterComparisonBody } from "./PosterComparisonBody";
import { PosterFourCardGridBody } from "./PosterFourCardGridBody";
import { PosterFullWidthSplitBody } from "./PosterFullWidthSplitBody";
import { PosterFullWidthBody } from "./PosterFullWidthBody";
import { PosterGoodBadPair } from "./PosterGoodBadPair";
import { PosterNoteBox } from "./PosterNoteBox";
import { PosterPositiveNegativeBody } from "./PosterPositiveNegativeBody";
import { PosterSummaryGrid } from "./PosterSummaryGrid";
import { PosterThreeColumnBody } from "./PosterThreeColumnBody";
import { getSectionPillColor } from "./poster-section-colors";
import type { PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

const posterGridGap = "gap-3";

function BannerBody({
  section,
  variant,
}: {
  section: PosterSection;
  variant: GrammarPosterVariant;
}) {
  if (!section.rememberBanner) {
    return null;
  }

  const hideTitle =
    variant === "poster" && section.rememberBanner.title === section.kidTitle;

  return (
    <PosterInteractiveTarget cardId={section.number} region="banner">
      <PosterNoteBox
        title={section.rememberBanner.title}
        body={section.rememberBanner.body}
        highlight={section.rememberBanner.highlight}
        variant={variant}
        hideTitle={hideTitle}
        dense={variant === "poster"}
      />
    </PosterInteractiveTarget>
  );
}

function TwoEqualNarrowBody({
  section,
  variant,
  gridGap,
}: {
  section: PosterSection;
  variant: GrammarPosterVariant;
  gridGap: string;
}) {
  return (
    <div className={`grid grid-cols-1 items-start ${gridGap} sm:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]`}>
      <div>
        {section.leftLabel ? (
          <PosterCategoryPill
            label={section.leftLabel}
            emoji={section.leftEmoji}
            backgroundColor={getSectionPillColor(section.color, section.palette)}
            variant={variant}
          />
        ) : null}
        {section.leftExamples?.map((example, i) => (
          <PosterExampleRow
            key={`left-${i}`}
            example={example}
            variant={variant}
            cardId={section.number}
            region="leftColumn"
            itemIndex={i}
          />
        ))}
      </div>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        {section.rightExamples?.map((example, i) => (
          <PosterExampleRow
            key={`right-${i}`}
            example={example}
            variant={variant}
            cardId={section.number}
            region="rightColumn"
            itemIndex={i}
          />
        ))}
      </div>
    </div>
  );
}

function TwoEqualBody({
  section,
  variant,
  gridGap,
}: {
  section: PosterSection;
  variant: GrammarPosterVariant;
  gridGap: string;
}) {
  return (
    <div>
      {section.goodBadPair ? (
        <PosterGoodBadPair
          pair={section.goodBadPair}
          variant={variant}
          accentColor={section.palette?.header}
        />
      ) : null}
      <div className={`grid grid-cols-1 items-start ${gridGap} sm:grid-cols-2`}>
      <div>
        {section.leftLabel ? (
          <PosterCategoryPill
            label={section.leftLabel}
            emoji={section.leftEmoji}
            backgroundColor={getSectionPillColor(section.color, section.palette)}
            variant={variant}
          />
        ) : null}
        {section.leftExamples?.map((example, i) => (
          <PosterExampleRow
            key={`left-${i}`}
            example={example}
            variant={variant}
            cardId={section.number}
            region="leftColumn"
            itemIndex={i}
          />
        ))}
      </div>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        {section.rightLabel ? (
          <PosterCategoryPill
            label={section.rightLabel}
            emoji={section.rightEmoji}
            backgroundColor={getSectionPillColor(section.color, section.palette)}
            variant={variant}
          />
        ) : null}
        {section.rightExamples?.map((example, i) => (
          <PosterExampleRow
            key={`right-${i}`}
            example={example}
            variant={variant}
            cardId={section.number}
            region="rightColumn"
            itemIndex={i}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

export function PosterSectionBody({ section, variant = "poster" }: Props) {
  const gridGap = variant === "poster" ? posterGridGap : "gap-4";

  switch (section.internalLayout) {
    case "banner":
      return <BannerBody section={section} variant={variant} />;
    case "three_column":
      return <PosterThreeColumnBody section={section} variant={variant} />;
    case "full_width_split":
      return <PosterFullWidthSplitBody section={section} variant={variant} />;
    case "positive_negative":
      return <PosterPositiveNegativeBody section={section} variant={variant} />;
    case "comparison":
      if (!section.comparisonLeft || !section.comparisonRight) {
        return null;
      }
      return (
        <PosterComparisonBody
          cardId={section.number}
          left={section.comparisonLeft}
          right={section.comparisonRight}
          variant={variant}
        />
      );
    case "summary_grid":
      return section.summaryGrid ? (
        <PosterSummaryGrid
          cardId={section.number}
          grid={section.summaryGrid}
          variant={variant}
          accentColor={section.palette?.header}
        />
      ) : null;
    case "four_card_grid":
      return section.miniCards ? (
        <PosterFourCardGridBody
          cardId={section.number}
          miniCards={section.miniCards}
          variant={variant}
        />
      ) : null;
    case "full_width":
      return <PosterFullWidthBody section={section} variant={variant} />;
    case "two_equal_narrow":
      return <TwoEqualNarrowBody section={section} variant={variant} gridGap={gridGap} />;
    case "two_equal":
      return <TwoEqualBody section={section} variant={variant} gridGap={gridGap} />;
    default: {
      const _exhaustive: never = section.internalLayout;
      return _exhaustive;
    }
  }
}

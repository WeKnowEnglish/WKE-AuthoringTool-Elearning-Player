import { getSectionPillColor } from "./poster-section-colors";
import { PosterExampleRow } from "./PosterExampleRow";
import { PosterSubHeader } from "./PosterSubHeader";
import type { PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

export function PosterThreeColumnBody({ section, variant = "poster" }: Props) {
  const columns = section.columns ?? [];

  return (
    <div>
      {section.subHeader ? (
        <PosterSubHeader
          {...section.subHeader}
          pillColor={getSectionPillColor(section.color, section.palette)}
          variant={variant}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {columns.map((column, index) => (
          <div key={`${section.number}-col-${index}`}>
            <PosterExampleRow
              example={column}
              variant={variant}
              cardId={section.number}
              region="item"
              itemIndex={index}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

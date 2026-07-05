import { getSectionPillColor } from "./PosterSectionCard";
import { PosterExampleColumn } from "./PosterExampleColumn";
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
          <PosterExampleColumn
            key={`${section.number}-col-${index}`}
            example={column}
            variant={variant}
            showDivider={index < columns.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

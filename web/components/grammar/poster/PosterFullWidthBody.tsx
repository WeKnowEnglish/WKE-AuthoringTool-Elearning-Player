import { getSectionPillColor } from "./poster-section-colors";
import { PosterExampleRow } from "./PosterExampleRow";
import { PosterSubHeader } from "./PosterSubHeader";
import { PosterTransformationRow } from "./PosterTransformationRow";
import type { PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

export function PosterFullWidthBody({ section, variant = "poster" }: Props) {
  const examples = section.stackedExamples ?? [];

  return (
    <div className="space-y-3">
      {section.subHeader ? (
        <PosterSubHeader
          {...section.subHeader}
          pillColor={getSectionPillColor(section.color, section.palette)}
          variant={variant}
        />
      ) : null}
      {examples.map((example, index) => (
        <div key={`${section.number}-stack-${index}`}>
          {example.transformationRow ? (
            <PosterTransformationRow row={example.transformationRow} variant={variant} />
          ) : (
            <PosterExampleRow example={example} variant={variant} />
          )}
        </div>
      ))}
    </div>
  );
}

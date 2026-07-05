import { PosterNoteBox } from "./PosterNoteBox";
import { PosterPatternRow } from "./PosterPatternRow";
import type { PosterSection } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

export function PosterFullWidthSplitBody({ section, variant = "poster" }: Props) {
  const leftPanel = section.leftPanel;
  const rightPanel = section.rightPanel;

  if (!leftPanel || !rightPanel) {
    return null;
  }

  const rightHighlight = rightPanel.warning ?? rightPanel.formula ?? rightPanel.body;

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        {leftPanel.title ? (
          <h3 className="text-base font-extrabold uppercase text-kid-ink md:text-lg">
            {leftPanel.title}
          </h3>
        ) : null}
        <p className="text-base font-semibold leading-relaxed text-kid-ink md:text-lg">
          {leftPanel.body}
        </p>
        {leftPanel.example ? (
          <p className="text-base font-semibold text-kid-ink/80 md:text-lg">{leftPanel.example}</p>
        ) : null}
        {section.leftPatterns?.map((pattern) => (
          <PosterPatternRow key={pattern.label} pattern={pattern} variant={variant} />
        ))}
      </div>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        <PosterNoteBox
          title={rightPanel.title ?? "Note"}
          body={rightPanel.body}
          highlight={rightHighlight}
          variant={variant}
        />
      </div>
    </div>
  );
}

import { PosterInteractiveTarget } from "./interactions/PosterInteractiveTarget";
import type { PosterSection, PosterSidePanel } from "./poster-view-model";
import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  section: PosterSection;
  variant?: GrammarPosterVariant;
};

function panelLines(panel: PosterSidePanel): string[] {
  const lines: string[] = [];
  if (panel.example?.trim()) {
    lines.push(panel.example.trim());
  }
  if (panel.body?.trim() && panel.body !== panel.example?.trim()) {
    lines.push(panel.body.trim());
  }
  if (panel.formula?.trim()) {
    lines.push(panel.formula.trim());
  }
  return lines;
}

function AnswerColumn({
  panel,
  accentColor,
  defaultTitle,
  variant,
}: {
  panel: PosterSidePanel;
  accentColor: string;
  defaultTitle: string;
  variant: GrammarPosterVariant;
}) {
  const title = panel.title?.trim() || defaultTitle;
  const lines = panelLines(panel);
  const textClass =
    variant === "poster" ?
      "text-base font-semibold leading-relaxed text-kid-ink md:text-lg"
    : "text-sm font-semibold leading-relaxed text-kid-ink";

  return (
    <div>
      <h3
        className="mb-2 text-xs font-extrabold uppercase tracking-wide md:text-sm"
        style={{ color: accentColor }}
      >
        {title}
      </h3>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={i} className={textClass}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function PosterPositiveNegativeBody({ section, variant = "poster" }: Props) {
  const positivePanel = section.positivePanel;
  const negativePanel = section.negativePanel;

  if (!positivePanel || !negativePanel) {
    return null;
  }

  const accentColor = section.palette?.header ?? "#1d4ed8";

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <PosterInteractiveTarget cardId={section.number} region="positiveSide">
        <AnswerColumn
          panel={positivePanel}
          accentColor={accentColor}
          defaultTitle="Yes"
          variant={variant}
        />
      </PosterInteractiveTarget>
      <div className="sm:border-l-2 sm:border-dashed sm:border-kid-ink/30 sm:pl-4">
        <PosterInteractiveTarget cardId={section.number} region="negativeSide">
          <AnswerColumn
            panel={negativePanel}
            accentColor={accentColor}
            defaultTitle="No"
            variant={variant}
          />
        </PosterInteractiveTarget>
      </div>
    </div>
  );
}

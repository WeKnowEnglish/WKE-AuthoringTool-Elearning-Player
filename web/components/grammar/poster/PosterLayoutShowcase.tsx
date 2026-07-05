import { clsx } from "clsx";
import type { ReactNode } from "react";
import { PosterExampleRow } from "./PosterExampleRow";
import { PosterPatternRow } from "./PosterPatternRow";
import { getSectionPillColor, PosterSectionCard } from "./PosterSectionCard";
import { POSTER_LAYOUT_SHOWCASE_DEMOS } from "./poster-view-model";

function LayoutLabel({ name, description }: { name: string; description: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-2">
      <span className="rounded-md border-2 border-kid-ink bg-kid-cta px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-kid-ink">
        {name}
      </span>
      <span className="text-xs font-semibold text-kid-ink/60">{description}</span>
    </div>
  );
}

function DemoCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border-2 border-dashed border-kid-ink/35 bg-white/60 p-2 sm:p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PosterLayoutShowcase() {
  const demos = POSTER_LAYOUT_SHOWCASE_DEMOS;

  return (
    <section className="mt-8 border-t-4 border-dashed border-kid-ink/20 pt-8">
      <div className="col-span-full">
        <h2 className="text-center text-lg font-extrabold uppercase tracking-wide text-kid-ink">
          Layout examples
        </h2>
        <p className="mt-1 text-center text-sm font-semibold text-kid-ink/60">
          Each card shows a different column layout used in grammar infographics
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {/* Single column */}
        <div>
          <LayoutLabel name="Single column" description="Full-width stacked blocks" />
          <DemoCell>
            <div className="space-y-2">
              {demos.single.map((ex, i) => (
                <PosterExampleRow key={i} example={ex} variant="showcase" />
              ))}
            </div>
          </DemoCell>
        </div>

        {/* Two columns 50/50 */}
        <div>
          <LayoutLabel name="Two columns (50 / 50)" description="Equal split" />
          <div className="grid grid-cols-2 gap-3">
            <DemoCell>
              <p className="mb-2 text-xs font-extrabold uppercase text-kid-ink/70">Left</p>
              {demos.twoLeft.map((ex, i) => (
                <PosterExampleRow key={i} example={ex} variant="showcase" />
              ))}
            </DemoCell>
            <DemoCell>
              <p className="mb-2 text-xs font-extrabold uppercase text-kid-ink/70">Right</p>
              {demos.twoRight.map((ex, i) => (
                <PosterExampleRow key={i} example={ex} variant="showcase" />
              ))}
            </DemoCell>
          </div>
        </div>

        {/* Two columns 30/70 */}
        <div>
          <LayoutLabel name="Two columns (30 / 70)" description="Narrow label + wide examples" />
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,7fr)] gap-3">
            <DemoCell className="flex flex-col items-center justify-center text-center">
              <span className="text-3xl" aria-hidden>
                👧👦
              </span>
              <p className="mt-2 text-sm font-extrabold uppercase text-kid-ink">Plural</p>
              <p className="text-xs font-bold text-kid-ink/60">+ ANY</p>
            </DemoCell>
            <DemoCell>
              {demos.thirtySeventy.map((ex, i) => (
                <PosterExampleRow key={i} example={ex} variant="showcase" />
              ))}
            </DemoCell>
          </div>
        </div>

        {/* Three columns — spans 2 cols on lg, full row on xl when needed */}
        <div className="lg:col-span-2 xl:col-span-3">
          <LayoutLabel name="Three columns" description="Side-by-side rules or patterns" />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {demos.threeCol.map((col, i) => (
              <PosterSectionCard
                key={i}
                number={i + 1}
                kidTitle={col.title}
                color={col.color}
                variant="showcase"
              >
                <p className="text-xs font-bold leading-snug text-kid-ink">{col.rule}</p>
                <p className="mt-2 text-2xl" aria-hidden>
                  {col.emoji}
                </p>
              </PosterSectionCard>
            ))}
          </div>
        </div>

        {/* Four card grid */}
        <div className="lg:col-span-2 xl:col-span-3">
          <LayoutLabel name="Four card grid" description="Compact rule cards in a row" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {demos.fourGrid.map((card, i) => (
              <PosterSectionCard
                key={i}
                number={i + 1}
                kidTitle={card.title}
                color={card.color}
                variant="showcase"
              >
                <p className="text-[11px] font-bold leading-tight text-kid-ink">{card.rule}</p>
                <p className="mt-1 font-mono text-xs font-extrabold text-kid-ink">{card.formula}</p>
              </PosterSectionCard>
            ))}
          </div>
        </div>

        {/* Comparison */}
        <div className="lg:col-span-2">
          <LayoutLabel name="Comparison" description="Rule vs exceptions" />
          <PosterSectionCard number={5} kidTitle="Nouns ending in -F or -FE" color="purple" variant="showcase">
            <div className="grid grid-cols-2 gap-3">
              <div className="border-r-2 border-dashed border-kid-ink/30 pr-3">
                <p className="mb-2 text-xs font-extrabold uppercase text-kid-ink">Change to -ves</p>
                {demos.comparison.rule.map((item, i) => (
                  <p key={i} className="text-xs font-bold text-kid-ink">
                    {item.emoji} {item.text}
                  </p>
                ))}
              </div>
              <div className="pl-1">
                <p className="mb-2 text-xs font-extrabold uppercase text-kid-ink">Exceptions (+s)</p>
                {demos.comparison.exceptions.map((item, i) => (
                  <p key={i} className="text-xs font-bold text-kid-ink">
                    {item.emoji} {item.text}
                  </p>
                ))}
              </div>
            </div>
          </PosterSectionCard>
        </div>

        {/* Banner */}
        <div>
          <LayoutLabel name="Banner" description="Full-width highlight strip" />
          <div
            className="rounded-xl border-2 border-kid-ink px-4 py-3 text-center shadow-[3px_3px_0_0_var(--kid-shadow)]"
            style={{ backgroundColor: getSectionPillColor("orange") }}
          >
            <p className="text-sm font-extrabold uppercase tracking-wide text-kid-ink">
              💡 Put <span className="text-[#c2410c]">Is</span> or{" "}
              <span className="text-[#c2410c]">Are</span> before There when you ask a question!
            </p>
          </div>
        </div>

        {/* Patterns row */}
        <div>
          <LayoutLabel name="Pattern stack" description="Formula blocks in a column" />
          <div className="grid grid-cols-3 gap-2">
            {demos.patterns.map((p) => (
              <PosterPatternRow key={p.label} pattern={p} variant="showcase" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

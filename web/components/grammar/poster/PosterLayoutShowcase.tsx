import Link from "next/link";
import type { LayoutLabCardView } from "@/lib/grammar-builder/load-layout-lab-card";
import type { LAYOUT_LAB_PAGE_LAYOUTS } from "@/lib/grammar-builder/layout-lab-index";
import { PosterSectionBody } from "./PosterSectionBody";
import { PosterSectionCard } from "./PosterSectionCard";

type PageLayoutRef = (typeof LAYOUT_LAB_PAGE_LAYOUTS)[number];

type Props = {
  cards: LayoutLabCardView[];
  pageLayouts: PageLayoutRef[];
};

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

export function PosterLayoutShowcase({ cards, pageLayouts }: Props) {
  return (
    <section className="mt-8 border-t-4 border-dashed border-kid-ink/20 pt-8">
      <div className="col-span-full">
        <h2 className="text-center text-lg font-extrabold uppercase tracking-wide text-kid-ink">
          Layout examples (JSON fixtures)
        </h2>
        <p className="mt-1 text-center text-sm font-semibold text-kid-ink/60">
          One author fixture card per layoutType — rendered through the same mapper as student posters
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {cards.map(({ entry, section, sourceLabel }) => (
          <div key={entry.layoutType}>
            <LayoutLabel name={entry.label} description={entry.description} />
            <p className="mb-2 text-[11px] font-semibold text-kid-ink/50">
              {sourceLabel} · card {entry.cardId}
              {entry.pageLayout ? ` · ${entry.pageLayout}` : ""}
            </p>
            <PosterSectionCard
              number={section.number}
              kidTitle={section.kidTitle}
              kidSubtitle={section.kidSubtitle}
              title={section.title}
              glanceRule={section.glanceRule}
              color={section.color}
              palette={section.palette}
              variant="showcase"
            >
              <PosterSectionBody section={section} variant="showcase" />
            </PosterSectionCard>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t-2 border-dashed border-kid-ink/20 pt-8">
        <h3 className="text-center text-base font-extrabold uppercase tracking-wide text-kid-ink">
          Page layouts (live posters)
        </h3>
        <ul className="mx-auto mt-4 flex max-w-xl flex-col gap-2">
          {pageLayouts.map((ref) => (
            <li key={ref.pageLayout}>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-kid-ink/30 bg-white/70 px-4 py-2">
                <Link
                  href={`/grammar/${ref.slug}`}
                  className="flex min-w-0 flex-1 items-center justify-between text-sm font-semibold text-kid-ink transition-colors hover:text-kid-ink/80"
                >
                  <span>{ref.label}</span>
                  <span className="font-mono text-xs text-kid-ink/50">{ref.pageLayout}</span>
                </Link>
                <Link
                  href={`/grammar/pilot/editor/${ref.slug}`}
                  className="shrink-0 rounded-lg border-2 border-kid-ink/20 bg-kid-panel px-2 py-1 text-xs font-bold text-kid-ink/70 hover:bg-white"
                >
                  Open in editor
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

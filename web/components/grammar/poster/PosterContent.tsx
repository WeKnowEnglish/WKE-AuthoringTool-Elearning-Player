import type { GrammarPageLayout } from "@/lib/grammar-builder/schema";
import {
  getPosterPageGridClass,
  getPosterSectionWrapperClass,
} from "@/lib/grammar-builder/poster-page-layout";
import { PosterHero } from "./PosterHero";
import { PosterSectionBody } from "./PosterSectionBody";
import { PosterSectionCard } from "./PosterSectionCard";
import type { PosterHeroData, PosterSection } from "./poster-view-model";

type Props = {
  hero: PosterHeroData;
  sections: PosterSection[];
  pageLayout: GrammarPageLayout;
};

export function PosterContent({ hero, sections, pageLayout }: Props) {
  return (
    <>
      <PosterHero hero={hero} />

      <div className={`mt-2 ${getPosterPageGridClass(pageLayout)}`}>
        {sections.map((section, index) => {
          const wrapperClass = getPosterSectionWrapperClass(index, pageLayout, sections.length);
          const card = (
            <PosterSectionCard
              number={section.number}
              kidTitle={section.kidTitle}
              kidSubtitle={section.kidSubtitle}
              glanceRule={section.glanceRule}
              color={section.color}
              palette={section.palette}
            >
              <PosterSectionBody section={section} />
            </PosterSectionCard>
          );

          return wrapperClass ? (
            <div key={section.number} className={wrapperClass}>
              {card}
            </div>
          ) : (
            <div key={section.number}>{card}</div>
          );
        })}
      </div>
    </>
  );
}

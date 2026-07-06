import Link from "next/link";
import type { GrammarPageLayout } from "@/lib/grammar-builder/schema";
import { PosterContent } from "./PosterContent";
import type { PosterHeroData, PosterSection } from "./poster-view-model";

type Props = {
  hero: PosterHeroData;
  sections: PosterSection[];
  pageLayout: GrammarPageLayout;
};

const showAuthorTools = process.env.NODE_ENV === "development";

export function GrammarPosterPage({ hero, sections, pageLayout }: Props) {
  return (
    <div className="pb-2">
      <div className="mb-2">
        <Link
          href="/grammar"
          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          ← Grammar
        </Link>
      </div>

      <PosterContent hero={hero} sections={sections} pageLayout={pageLayout} />

      {showAuthorTools ? (
        <p className="mt-6 text-center">
          <Link
            href="/grammar/pilot/layouts"
            className="text-sm font-semibold text-kid-ink/40 underline-offset-2 hover:text-kid-ink/60 hover:underline"
          >
            Layout lab (authors)
          </Link>
        </p>
      ) : null}
    </div>
  );
}

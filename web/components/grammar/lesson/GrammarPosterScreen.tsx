"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { loadPosterModuleBySlug } from "@/lib/grammar-builder/load-poster-module-by-slug";
import { PosterContent } from "@/components/grammar/poster/PosterContent";

type Props = {
  grammarSlug: string;
  onComplete: () => void;
  completeLabel?: string;
};

export function GrammarPosterScreen({
  grammarSlug,
  onComplete,
  completeLabel = "Complete",
}: Props) {
  const { hero, sections, pageLayout } = loadPosterModuleBySlug(grammarSlug);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <PosterContent hero={hero} sections={sections} pageLayout={pageLayout} />
      </div>
      <div className="shrink-0 border-t-2 border-kid-ink/15 bg-kid-panel/95 pt-3">
        <KidButton type="button" className="w-full" onClick={onComplete}>
          {completeLabel}
        </KidButton>
      </div>
    </div>
  );
}

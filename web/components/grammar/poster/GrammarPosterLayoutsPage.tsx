import Link from "next/link";
import { GRAMMAR_TEACHER_EDITOR_INDEX_PATH } from "@/lib/grammar-builder/editor/grammar-editor-paths";
import { loadAllLayoutLabCards } from "@/lib/grammar-builder/load-layout-lab-card";
import { LAYOUT_LAB_PAGE_LAYOUTS } from "@/lib/grammar-builder/layout-lab-index";
import { PosterLayoutShowcase } from "./PosterLayoutShowcase";

export function GrammarPosterLayoutsPage() {
  const cards = loadAllLayoutLabCards();

  return (
    <div className="pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/grammar"
            className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
          >
            ← Back to grammar hub
          </Link>
          <Link
            href={GRAMMAR_TEACHER_EDITOR_INDEX_PATH}
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-2 text-sm font-semibold text-kid-ink/70"
          >
            Poster editor
          </Link>
        </div>
        <span className="rounded-full border-2 border-kid-ink/30 bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
          Layout lab (authors)
        </span>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-kid-ink/30 bg-white/50 p-4 sm:p-6">
        <PosterLayoutShowcase cards={cards} pageLayouts={LAYOUT_LAB_PAGE_LAYOUTS} />
      </div>
    </div>
  );
}

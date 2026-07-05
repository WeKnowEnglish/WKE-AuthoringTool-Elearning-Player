import Link from "next/link";
import { PosterLayoutShowcase } from "./PosterLayoutShowcase";

export function GrammarPosterLayoutsPage() {
  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/grammar/there-is-there-are-questions-a1"
          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          ← Back to poster
        </Link>
        <span className="rounded-full border-2 border-kid-ink/30 bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
          Layout lab (authors)
        </span>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-kid-ink/30 bg-white/50 p-4 sm:p-6">
        <PosterLayoutShowcase />
      </div>
    </div>
  );
}

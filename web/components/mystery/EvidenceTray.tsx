import { Camera, FileText, MapPin, SearchCheck } from "lucide-react";
import { clsx } from "clsx";
import type { EvidenceType, MysteryClue } from "@/lib/mystery/types";

const typeLabels: Record<EvidenceType, string> = {
  physical: "Object",
  statement: "Statement",
  observation: "Observation",
  location: "Location",
  document: "Document",
  photo: "Photo",
};

function EvidenceIcon({ type }: { type: EvidenceType }) {
  if (type === "photo") return <Camera aria-hidden className="size-4" />;
  if (type === "document") return <FileText aria-hidden className="size-4" />;
  if (type === "location") return <MapPin aria-hidden className="size-4" />;
  return <SearchCheck aria-hidden className="size-4" />;
}

export function EvidenceTray({
  clues,
  discoveredClueIds,
}: {
  clues: MysteryClue[];
  discoveredClueIds: ReadonlySet<string>;
}) {
  const discovered = clues.filter((clue) => discoveredClueIds.has(clue.id));

  return (
    <aside
      aria-label="Evidence tray"
      className="flex h-full min-h-0 flex-col rounded-2xl border-4 border-kid-ink bg-kid-panel p-4 shadow-[5px_5px_0_0_var(--kid-shadow)]"
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-kid-ink/15 pb-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-kid-ink/55">
            Case file
          </p>
          <h2 className="text-xl font-extrabold text-kid-ink">Evidence tray</h2>
        </div>
        <span className="rounded-full border-2 border-kid-ink bg-kid-cta px-3 py-1 text-sm font-extrabold text-kid-ink">
          {discovered.length}/{clues.length}
        </span>
      </div>

      {discovered.length === 0 ? (
        <div className="my-auto rounded-xl border-2 border-dashed border-kid-ink/25 bg-kid-surface-muted p-5 text-center">
          <SearchCheck aria-hidden className="mx-auto size-8 text-kid-ink/45" />
          <p className="mt-2 text-sm font-extrabold text-kid-ink">
            No evidence yet
          </p>
          <p className="mt-1 text-xs font-semibold text-kid-ink/65">
            Inspect the yellow markers. Useful discoveries will appear here.
          </p>
        </div>
      ) : (
        <ol className="scrollbar-reveal mt-3 space-y-3 overflow-y-auto pr-1">
          {discovered.map((clue, index) => (
            <li
              key={clue.id}
              className="rounded-xl border-2 border-kid-ink/15 bg-kid-surface-muted/60 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-kid-ink bg-white text-sm font-extrabold text-kid-ink">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-kid-ink">{clue.title}</h3>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                        clue.importance === "key"
                          ? "bg-amber-200 text-amber-950"
                          : "bg-white text-kid-ink/65",
                      )}
                    >
                      <EvidenceIcon type={clue.type} />
                      {typeLabels[clue.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-snug text-kid-ink/75">
                    {clue.description}
                  </p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-kid-ink/45">
                    Found: {clue.foundAt}
                  </p>
                  {clue.prompt ? (
                    <p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-kid-ink/70">
                      Think: {clue.prompt}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

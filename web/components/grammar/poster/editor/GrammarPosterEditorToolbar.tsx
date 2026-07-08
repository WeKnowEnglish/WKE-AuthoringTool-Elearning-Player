"use client";

import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  slug: string;
  title: string;
  dirty: boolean;
  previewMode: boolean;
  strictValid: boolean;
  issueCount: number;
  statusMessage: string | null;
  onTogglePreview: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onReset: () => void;
};

export function GrammarPosterEditorToolbar({
  slug,
  title,
  dirty,
  previewMode,
  strictValid,
  issueCount,
  statusMessage,
  onTogglePreview,
  onCopyJson,
  onDownloadJson,
  onReset,
}: Props) {
  const exportDisabled = !strictValid;

  return (
    <header className="space-y-3 rounded-2xl border-2 border-kid-ink/20 bg-white/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/grammar/pilot/editor"
            className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
          >
            ← Posters
          </Link>
          <Link
            href="/grammar/pilot/layouts"
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-1.5 text-sm font-semibold text-kid-ink/70"
          >
            Layout lab
          </Link>
          <Link
            href={`/grammar/${slug}`}
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-1.5 text-sm font-semibold text-kid-ink/70"
          >
            Student view
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {dirty ?
            <span
              className="h-2.5 w-2.5 rounded-full bg-amber-500"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            />
          : null}
          <span className="rounded-full border-2 border-kid-ink/30 bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
            Author editor
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-kid-ink sm:text-xl">{title}</h1>
          <p className="font-mono text-xs font-semibold text-kid-ink/50">{slug}</p>
        </div>
        {statusMessage ?
          <p className="text-sm font-semibold text-emerald-700" role="status">
            {statusMessage}
          </p>
        : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <KidButton variant="secondary" onClick={onTogglePreview}>
          {previewMode ? "Edit mode" : "Preview"}
        </KidButton>
        <KidButton variant="secondary" onClick={onCopyJson} disabled={exportDisabled}>
          Copy JSON
        </KidButton>
        <KidButton variant="secondary" onClick={onDownloadJson} disabled={exportDisabled}>
          Download JSON
        </KidButton>
        <KidButton variant="secondary" onClick={onReset} disabled={!dirty}>
          Reset
        </KidButton>
        {!strictValid && issueCount > 0 ?
          <span className="text-xs font-bold text-amber-800">
            {issueCount} validation {issueCount === 1 ? "error" : "errors"}
          </span>
        : null}
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import {
  GRAMMAR_TEACHER_EDITOR_INDEX_PATH,
  grammarTeacherEditorSlugPath,
} from "@/lib/grammar-builder/editor/grammar-editor-paths";
import {
  getGrammarPosterVariations,
  type GrammarPosterVariation,
} from "@/lib/grammar-builder/editor/grammar-poster-variations";
import type { GrammarModulePersistedStatus } from "@/lib/data/grammar-modules";

type Props = {
  slug: string;
  title: string;
  variation?: GrammarPosterVariation | null;
  dirty: boolean;
  previewMode: boolean;
  lenientValid: boolean;
  strictValid: boolean;
  issueCount: number;
  persistedStatus: GrammarModulePersistedStatus | null;
  saving: boolean;
  statusMessage: string | null;
  onTogglePreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onReset: () => void;
};

export function GrammarPosterEditorToolbar({
  slug,
  title,
  variation = null,
  dirty,
  previewMode,
  lenientValid,
  strictValid,
  issueCount,
  persistedStatus,
  saving,
  statusMessage,
  onTogglePreview,
  onSave,
  onPublish,
  onCopyJson,
  onDownloadJson,
  onReset,
}: Props) {
  const router = useRouter();
  const variations = getGrammarPosterVariations();
  const exportDisabled = !strictValid;
  const saveDisabled = saving || !lenientValid || !dirty;
  const publishDisabled = saving || !strictValid;

  function handleSwitchVariation(nextSlug: string) {
    if (!nextSlug || nextSlug === slug) {
      return;
    }
    if (dirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Switch variation and discard them?",
      );
      if (!confirmed) {
        return;
      }
    }
    router.push(grammarTeacherEditorSlugPath(nextSlug));
  }

  return (
    <header className="space-y-3 rounded-2xl border-2 border-kid-ink/20 bg-white/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={GRAMMAR_TEACHER_EDITOR_INDEX_PATH}
            className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
          >
            ← Editor home
          </Link>
          <Link
            href="/grammar/pilot/layouts"
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-1.5 text-sm font-semibold text-kid-ink/70"
          >
            Layout type gallery
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
            {persistedStatus === "published" ?
              "Published"
            : persistedStatus === "draft" ?
              "Draft saved"
            : "Bundled file"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/45">
            Grammar Poster Editor
            {variation?.canonical ? " · Canonical" : " · Template variation"}
          </p>
          <h1 className="text-lg font-extrabold text-kid-ink sm:text-xl">
            {variation?.thumbnailEmoji ? `${variation.thumbnailEmoji} ` : ""}
            {title}
          </h1>
          <p className="font-mono text-xs font-semibold text-kid-ink/50">{slug}</p>
          {variation?.topicLabel ?
            <p className="mt-0.5 text-xs font-semibold text-kid-ink/45">
              {variation.topicLabel}
              {variation.pageLayout ? ` · ${variation.pageLayout}` : ""}
            </p>
          : null}
        </div>

        <label className="flex min-w-[14rem] flex-col gap-1 text-xs font-bold uppercase tracking-wide text-kid-ink/55">
          Switch variation
          <select
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-kid-ink outline-none focus:border-kid-cta"
            value={slug}
            onChange={(event) => handleSwitchVariation(event.target.value)}
            aria-label="Switch template variation"
          >
            {variations.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.canonical ? "★ " : ""}
                {entry.title}
              </option>
            ))}
          </select>
        </label>

        {statusMessage ?
          <p className="w-full text-sm font-semibold text-emerald-700 sm:w-auto" role="status">
            {statusMessage}
          </p>
        : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <KidButton variant="primary" onClick={onSave} disabled={saveDisabled}>
          {saving ? "Saving…" : "Save"}
        </KidButton>
        <KidButton variant="primary" onClick={onPublish} disabled={publishDisabled}>
          Publish
        </KidButton>
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mapPosterModule, type PosterModuleView } from "@/lib/grammar-builder/map-poster-module";
import type { GrammarModule } from "@/lib/grammar-builder/schema";
import {
  copyGrammarModuleJson,
  downloadGrammarModuleJson,
} from "@/lib/grammar-builder/editor/export-grammar-module";
import {
  grammarModuleSnapshot,
  isGrammarModuleDirty,
} from "@/lib/grammar-builder/editor/grammar-module-snapshot";
import { parseGrammarModule, safeParseGrammarModule } from "@/lib/grammar-builder/validate-module";
import type { InteractionTargetKey } from "@/lib/grammar-builder/interactions/resolve-interaction-target";
import { GrammarPosterEditorCanvas } from "./GrammarPosterEditorCanvas";
import { GrammarPosterEditorToolbar } from "./GrammarPosterEditorToolbar";
import { GrammarPosterJsonPanel } from "./GrammarPosterJsonPanel";
import { GrammarPosterPropertyPanel } from "./GrammarPosterPropertyPanel";
import { GrammarPosterValidationPanel } from "./GrammarPosterValidationPanel";

type Props = {
  slug: string;
  title: string;
  sourceFile: string;
  initialModule: unknown;
};

export function GrammarPosterEditorApp({ slug, title, sourceFile, initialModule }: Props) {
  const initialDraft = useMemo(
    () => parseGrammarModule(initialModule, { posterContentRules: false }),
    [initialModule],
  );

  const [draft, setDraft] = useState<GrammarModule>(initialDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(() => grammarModuleSnapshot(initialDraft));
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [cardTab, setCardTab] = useState<"chrome" | "body" | "interactions">("chrome");
  const [pickedTargetKey, setPickedTargetKey] = useState<InteractionTargetKey | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const lastValidViewRef = useRef<PosterModuleView>(mapPosterModule(initialDraft));

  const lenientParse = useMemo(
    () => safeParseGrammarModule(draft, { posterContentRules: false }),
    [draft],
  );
  const strictParse = useMemo(
    () => safeParseGrammarModule(draft, { posterContentRules: true }),
    [draft],
  );

  const renderParse = previewMode ? strictParse : lenientParse;
  const strictValid = strictParse.success;
  const strictIssues = strictValid ? [] : strictParse.error.issues;
  const renderIssues = renderParse.success ? [] : renderParse.error.issues;

  const currentView = useMemo(() => {
    if (renderParse.success) {
      const view = mapPosterModule(renderParse.data);
      lastValidViewRef.current = view;
      return view;
    }
    return lastValidViewRef.current;
  }, [renderParse]);

  const dirty = isGrammarModuleDirty(draft, savedSnapshot);

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2500);
  }, []);

  useEffect(() => {
    if (previewMode && !strictValid) {
      showStatus("Fix validation errors before student preview is accurate.");
    }
  }, [previewMode, strictValid, showStatus]);

  function handleReset() {
    if (!dirty) {
      return;
    }
    const confirmed = window.confirm("Reset all changes to the last loaded version?");
    if (!confirmed) {
      return;
    }
    setDraft(initialDraft);
    setSavedSnapshot(grammarModuleSnapshot(initialDraft));
    setSelectedCardId(null);
    lastValidViewRef.current = mapPosterModule(initialDraft);
    showStatus("Changes reset.");
  }

  async function handleCopyJson() {
    if (!strictParse.success) {
      return;
    }
    await copyGrammarModuleJson(strictParse.data);
    showStatus("JSON copied to clipboard.");
  }

  function handleDownloadJson() {
    if (!strictParse.success) {
      return;
    }
    downloadGrammarModuleJson(sourceFile, strictParse.data);
    showStatus("JSON downloaded.");
  }

  const interactionMode = cardTab === "interactions" ? "author" : "off";
  const pickTargetMode = cardTab === "interactions" && !previewMode;

  function handleCardTabChange(tab: "chrome" | "body" | "interactions") {
    setCardTab(tab);
    if (tab !== "interactions") {
      setPickedTargetKey(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-6">
      <GrammarPosterEditorToolbar
        slug={slug}
        title={title}
        dirty={dirty}
        previewMode={previewMode}
        strictValid={strictValid}
        issueCount={strictIssues.length}
        statusMessage={statusMessage}
        onTogglePreview={() => setPreviewMode((value) => !value)}
        onCopyJson={handleCopyJson}
        onDownloadJson={handleDownloadJson}
        onReset={handleReset}
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <GrammarPosterEditorCanvas
          view={currentView}
          interactions={draft.interactions}
          interactionMode={interactionMode}
          pickTargetMode={pickTargetMode}
          pickedTargetKey={pickedTargetKey}
          onPickTarget={setPickedTargetKey}
          previewMode={previewMode}
          selectedCardId={selectedCardId}
          onSelectCard={pickTargetMode ? undefined : setSelectedCardId}
          validationIssues={renderIssues}
          showValidationBanner={!renderParse.success}
          cardIds={draft.cards.map((card) => card.id)}
        />

        <div className="flex min-h-0 flex-col gap-3">
          {!previewMode ?
            <GrammarPosterPropertyPanel
              draft={draft}
              selectedCardId={selectedCardId}
              pickedTargetKey={pickedTargetKey}
              onChange={setDraft}
              onSelectCard={setSelectedCardId}
              onCardTabChange={handleCardTabChange}
            />
          : <section className="rounded-2xl border-2 border-kid-ink/20 bg-kid-panel/50 p-4 text-sm font-semibold text-kid-ink/60">
              Preview mode shows the student poster. Switch to edit mode to change properties.
            </section>
          }

          <GrammarPosterValidationPanel
            issues={strictIssues}
            strictValid={strictValid}
            previewMode={previewMode}
          />
          <GrammarPosterJsonPanel module={draft} />
        </div>
      </div>
    </div>
  );
}

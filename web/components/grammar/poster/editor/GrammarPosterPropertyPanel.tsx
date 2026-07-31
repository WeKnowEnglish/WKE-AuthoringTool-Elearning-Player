"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { GrammarAlign, GrammarCard, GrammarLayoutType, GrammarModule } from "@/lib/grammar-builder/schema";
import {
  updateCardField,
  updateCardGlanceRule,
  updateCardTheme,
  updateModuleDifficulty,
  updateModuleField,
} from "@/lib/grammar-builder/editor/grammar-module-mutations";
import {
  changeCardLayoutType,
  updateModulePageLayoutWithRows,
} from "@/lib/grammar-builder/editor/grammar-card-structure-mutations";
import { LAYOUT_TYPE_OPTIONS } from "@/lib/grammar-builder/editor/layout-type-scaffolds";
import {
  advisePageLayout,
  applySuggestedPageLayout,
} from "@/lib/grammar-builder/editor/page-layout-advisor";
import {
  getPageLayoutHint,
  PAGE_LAYOUT_OPTIONS,
} from "@/lib/grammar-builder/editor/page-layout-hints";
import { GRAMMAR_THEME_IDS } from "@/lib/grammar-builder/theme-tokens";
import { GrammarPosterCardBodyPanel } from "./GrammarPosterCardBodyPanel";
import { GrammarPosterCardOrderControls } from "./GrammarPosterCardOrderControls";
import { GrammarPosterCustomRowsPanel } from "./GrammarPosterCustomRowsPanel";
import { GrammarPosterInteractionsPanel } from "./GrammarPosterInteractionsPanel";
import { LayoutTypeChangeDialog } from "./LayoutTypeChangeDialog";
import { EditorFieldLabel, EditorTextInput } from "./fields/EditorFields";
import type { InteractionTargetKey } from "@/lib/grammar-builder/interactions/resolve-interaction-target";

type Props = {
  draft: GrammarModule;
  selectedCardId: number | null;
  pickedTargetKey?: InteractionTargetKey | null;
  onChange: (module: GrammarModule) => void;
  onSelectCard: (cardId: number | null) => void;
  onCardTabChange?: (tab: CardTab) => void;
};

type CardTab = "chrome" | "body" | "interactions";

const THERE_IS_LAYOUTS = new Set<GrammarLayoutType>(["two-equal", "full-width", "banner"]);

function AlignControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GrammarAlign;
  onChange: (value: GrammarAlign) => void;
}) {
  return (
    <div>
      <EditorFieldLabel>{label}</EditorFieldLabel>
      <div className="mt-1 flex overflow-hidden rounded-lg border-2 border-kid-ink/20">
        {(["left", "center", "right"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={clsx(
              "flex-1 px-2 py-1.5 text-xs font-extrabold uppercase tracking-wide",
              value === option ? "bg-kid-cta text-kid-ink" : "bg-white text-kid-ink/60 hover:bg-kid-panel",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardChromeFields({
  card,
  draft,
  onChange,
  onLayoutTypeRequest,
}: {
  card: GrammarCard;
  draft: GrammarModule;
  onChange: (module: GrammarModule) => void;
  onLayoutTypeRequest: (layoutType: GrammarLayoutType) => void;
}) {
  const layoutMeta = LAYOUT_TYPE_OPTIONS.find((option) => option.value === card.layoutType);

  return (
    <section className="space-y-3 border-t border-dashed border-kid-ink/15 pt-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink">
        Card {card.id}
      </h3>

      <div>
        <EditorFieldLabel>Layout type</EditorFieldLabel>
        <select
          value={card.layoutType}
          onChange={(event) =>
            onLayoutTypeRequest(event.target.value as GrammarLayoutType)
          }
          className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
        >
          {LAYOUT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {layoutMeta ?
          <p className="mt-1 text-xs font-medium text-kid-ink/60">{layoutMeta.description}</p>
        : null}
      </div>

      <div>
        <EditorFieldLabel>Theme</EditorFieldLabel>
        <select
          value={card.theme}
          onChange={(event) =>
            onChange(updateCardTheme(draft, card.id, event.target.value as typeof card.theme))
          }
          className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
        >
          {GRAMMAR_THEME_IDS.map((themeId) => (
            <option key={themeId} value={themeId}>
              {themeId}
            </option>
          ))}
        </select>
      </div>

      <div>
        <EditorFieldLabel>Kid title</EditorFieldLabel>
        <EditorTextInput
          value={card.kidTitle ?? ""}
          maxLength={40}
          onChange={(value) => onChange(updateCardField(draft, card.id, "kidTitle", value))}
        />
      </div>

      <div>
        <EditorFieldLabel>Kid subtitle</EditorFieldLabel>
        <EditorTextInput
          value={card.kidSubtitle ?? ""}
          maxLength={30}
          onChange={(value) =>
            onChange(updateCardField(draft, card.id, "kidSubtitle", value || undefined))
          }
        />
      </div>

      <div>
        <EditorFieldLabel>Glance rule</EditorFieldLabel>
        <EditorTextInput
          value={card.glanceRule?.text ?? ""}
          maxLength={60}
          onChange={(value) => onChange(updateCardGlanceRule(draft, card.id, { text: value }))}
        />
      </div>

      <div>
        <EditorFieldLabel>Glance highlight</EditorFieldLabel>
        <EditorTextInput
          value={card.glanceRule?.highlight ?? ""}
          onChange={(value) =>
            onChange(updateCardGlanceRule(draft, card.id, { highlight: value || undefined }))
          }
        />
      </div>

      {THERE_IS_LAYOUTS.has(card.layoutType) ?
        <>
          <AlignControl
            label="Title justification"
            value={card.chromeAlign ?? "center"}
            onChange={(value) => onChange(updateCardField(draft, card.id, "chromeAlign", value))}
          />
          <AlignControl
            label="Glance rule justification"
            value={card.glanceRule?.align ?? "center"}
            onChange={(value) => onChange(updateCardGlanceRule(draft, card.id, { align: value }))}
          />
        </>
      : <p className="text-xs font-medium text-kid-ink/50">
          Icon URL + justification controls are first-class on There is / There are card shapes
          (two-equal, full-width, banner).
        </p>
      }
    </section>
  );
}

export function GrammarPosterPropertyPanel({
  draft,
  selectedCardId,
  pickedTargetKey,
  onChange,
  onSelectCard,
  onCardTabChange,
}: Props) {
  function setCardTab(tab: CardTab) {
    setCardTabState(tab);
    onCardTabChange?.(tab);
  }

  const [cardTab, setCardTabState] = useState<CardTab>("chrome");
  const [pendingLayoutType, setPendingLayoutType] = useState<GrammarLayoutType | null>(null);

  const selectedCard = draft.cards.find((card) => card.id === selectedCardId) ?? null;
  const pageLayoutHint = getPageLayoutHint(draft.pageLayout);
  const layoutAdvice = advisePageLayout(draft);

  function applyChange(updater: (module: GrammarModule) => GrammarModule) {
    onChange(updater(draft));
  }

  function handleLayoutTypeRequest(layoutType: GrammarLayoutType) {
    if (!selectedCard || layoutType === selectedCard.layoutType) {
      return;
    }
    setPendingLayoutType(layoutType);
  }

  function confirmLayoutTypeChange() {
    if (!selectedCard || !pendingLayoutType) {
      return;
    }
    onChange(changeCardLayoutType(draft, selectedCard.id, pendingLayoutType));
    setPendingLayoutType(null);
    setCardTab("body");
  }

  return (
    <>
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border-2 border-kid-ink/20 bg-kid-panel/50 p-3 sm:p-4">
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-kid-ink">Module</h2>

          <div>
            <EditorFieldLabel>Page layout</EditorFieldLabel>
            <select
              value={draft.pageLayout}
              onChange={(event) =>
                applyChange((module) =>
                  updateModulePageLayoutWithRows(
                    module,
                    event.target.value as typeof draft.pageLayout,
                  ),
                )
              }
              className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
            >
              {PAGE_LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
            {pageLayoutHint ?
              <p className="mt-1 text-xs font-medium text-kid-ink/60">{pageLayoutHint}</p>
            : null}
          </div>

          <div className="space-y-1">
            {layoutAdvice.map((item) => (
              <div
                key={`${item.severity}-${item.message}`}
                className={
                  item.severity === "ok" ?
                    "text-xs font-medium text-emerald-700"
                  : item.severity === "warn" ?
                    "text-xs font-medium text-amber-800"
                  : "text-xs font-medium text-red-700"
                }
              >
                <p>{item.message}</p>
                {item.suggestedPageLayout ?
                  <button
                    type="button"
                    onClick={() =>
                      onChange(applySuggestedPageLayout(draft, item.suggestedPageLayout!))
                    }
                    className="mt-0.5 font-bold underline"
                  >
                    Apply {item.suggestedPageLayout}
                  </button>
                : null}
              </div>
            ))}
          </div>

          <GrammarPosterCustomRowsPanel draft={draft} onChange={onChange} />

          <div>
            <EditorFieldLabel>Module title</EditorFieldLabel>
            <EditorTextInput
              value={draft.moduleTitle}
              onChange={(value) =>
                applyChange((module) => updateModuleField(module, "moduleTitle", value))
              }
            />
          </div>

          <div>
            <EditorFieldLabel>Module subtitle</EditorFieldLabel>
            <EditorTextInput
              value={draft.moduleSubtitle ?? ""}
              onChange={(value) =>
                applyChange((module) =>
                  updateModuleField(module, "moduleSubtitle", value || undefined),
                )
              }
            />
          </div>

          <div>
            <EditorFieldLabel>Difficulty</EditorFieldLabel>
            <select
              value={draft.difficulty ?? ""}
              onChange={(event) =>
                applyChange((module) =>
                  updateModuleDifficulty(
                    module,
                    event.target.value ?
                      (event.target.value as NonNullable<typeof draft.difficulty>)
                    : undefined,
                  ),
                )
              }
              className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold text-kid-ink outline-none focus:border-kid-cta"
            >
              <option value="">(none)</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
            </select>
          </div>
        </section>

        <GrammarPosterCardOrderControls
          draft={draft}
          selectedCardId={selectedCardId}
          onChange={onChange}
          onSelectCard={onSelectCard}
        />

        {selectedCard ?
          <>
            <div className="flex gap-1 border-t border-dashed border-kid-ink/15 pt-3">
              {(["chrome", "body", "interactions"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCardTab(tab)}
                  className={
                    cardTab === tab ?
                      "rounded-lg border-2 border-kid-ink bg-kid-cta px-3 py-1 text-xs font-extrabold uppercase"
                    : "rounded-lg border-2 border-kid-ink/20 bg-white px-3 py-1 text-xs font-bold uppercase text-kid-ink/60"
                  }
                >
                  {tab}
                </button>
              ))}
            </div>

            {cardTab === "chrome" ?
              <CardChromeFields
                card={selectedCard}
                draft={draft}
                onChange={onChange}
                onLayoutTypeRequest={handleLayoutTypeRequest}
              />
            : cardTab === "body" ?
              <GrammarPosterCardBodyPanel draft={draft} card={selectedCard} onChange={onChange} />
            : <GrammarPosterInteractionsPanel
                draft={draft}
                card={selectedCard}
                pickedTargetKey={pickedTargetKey}
                onChange={onChange}
              />}
          </>
        : <p className="border-t border-dashed border-kid-ink/15 pt-3 text-sm font-semibold text-kid-ink/50">
            Click a card on the canvas to edit its properties.
          </p>
        }
      </aside>

      {selectedCard && pendingLayoutType ?
        <LayoutTypeChangeDialog
          open
          currentLayoutType={selectedCard.layoutType}
          nextLayoutType={pendingLayoutType}
          onConfirm={confirmLayoutTypeChange}
          onCancel={() => setPendingLayoutType(null)}
        />
      : null}
    </>
  );
}

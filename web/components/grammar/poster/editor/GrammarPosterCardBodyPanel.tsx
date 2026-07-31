"use client";

import type { ReactNode } from "react";
import type { GrammarAlign, GrammarCard, GrammarModule } from "@/lib/grammar-builder/schema";
import {
  updateCardComparisonItem,
  updateCardComparisonSide,
  updateCardItem,
  updateCardBannerText,
  updateCardSidePanel,
  updateMiniCard,
  updateSummaryGridCell,
  updateSummaryGridColumn,
  updateSummaryGridRowLabel,
} from "@/lib/grammar-builder/editor/grammar-card-body-mutations";
import {
  patchItemEmojiGraphic,
  patchItemUrlGraphic,
  resolveItemAlign,
  resolveItemEmoji,
  resolveItemImageUrl,
} from "@/lib/grammar-builder/editor/grammar-item-graphic";
import {
  getColumnItemHint,
  getGlanceRuleHint,
  getKidTitleHint,
} from "@/lib/grammar-builder/editor/a1-authoring-hints";
import {
  EditorFieldLabel,
  EditorHint,
  EditorSectionTitle,
  EditorTextInput,
} from "./fields/EditorFields";
import { GrammarPosterIconAlignControls } from "./GrammarPosterIconAlignControls";
import { GRAMMAR_THEME_IDS } from "@/lib/grammar-builder/theme-tokens";
import type { GrammarSummaryMark } from "@/lib/grammar-builder/schema";

type Props = {
  draft: GrammarModule;
  card: GrammarCard;
  onChange: (module: GrammarModule) => void;
};

function ItemFields({
  label,
  text,
  graphic,
  imageUrl,
  highlight,
  caption,
  align,
  onText,
  onGraphic,
  onImageUrl,
  onHighlight,
  onCaption,
  onAlign,
}: {
  label: string;
  text: string;
  graphic: string;
  imageUrl: string;
  highlight: string;
  caption: string;
  align: GrammarAlign;
  onText: (value: string) => void;
  onGraphic: (value: string) => void;
  onImageUrl: (value: string) => void;
  onHighlight: (value: string) => void;
  onCaption: (value: string) => void;
  onAlign: (value: GrammarAlign) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-kid-ink/15 p-2">
      <EditorSectionTitle>{label}</EditorSectionTitle>
      <div className="mt-2 space-y-2">
        <div>
          <EditorFieldLabel>Sentence</EditorFieldLabel>
          <EditorTextInput value={text} onChange={onText} />
        </div>
        <GrammarPosterIconAlignControls
          emoji={graphic}
          imageUrl={imageUrl}
          align={align}
          onEmojiChange={onGraphic}
          onImageUrlChange={onImageUrl}
          onAlignChange={onAlign}
        />
        <div>
          <EditorFieldLabel>Highlight</EditorFieldLabel>
          <EditorTextInput value={highlight} onChange={onHighlight} />
        </div>
        <div>
          <EditorFieldLabel>Caption</EditorFieldLabel>
          <EditorTextInput value={caption} onChange={onCaption} />
        </div>
      </div>
    </div>
  );
}

function TwoEqualBodyEditor({ draft, card, onChange }: Props) {
  const sides = ["leftColumn", "rightColumn"] as const;

  return (
    <div className="space-y-3">
      {sides.map((side) => {
        const column = card[side];
        const itemHint = getColumnItemHint(column?.items.length ?? 0, draft.difficulty);
        return (
          <div key={side} className="space-y-2">
            <EditorSectionTitle>{side === "leftColumn" ? "Left column" : "Right column"}</EditorSectionTitle>
            <div>
              <EditorFieldLabel>Title</EditorFieldLabel>
              <EditorTextInput
                value={column?.title ?? ""}
                onChange={(value) =>
                  onChange(updateCardComparisonSide(draft, card.id, side, { title: value }))
                }
              />
            </div>
            <div>
              <EditorFieldLabel>Badge</EditorFieldLabel>
              <EditorTextInput
                value={column?.badge ?? ""}
                onChange={(value) =>
                  onChange(
                    updateCardComparisonSide(draft, card.id, side, {
                      badge: value || undefined,
                    }),
                  )
                }
              />
            </div>
            {(column?.items ?? []).map((item, index) => (
              <ItemFields
                key={`${side}-${index}`}
                label={`Example ${index + 1}`}
                text={item.text ?? ""}
                graphic={resolveItemEmoji(item)}
                imageUrl={resolveItemImageUrl(item)}
                highlight={item.highlight ?? ""}
                caption={item.caption ?? ""}
                align={resolveItemAlign(item)}
                onText={(value) =>
                  onChange(updateCardComparisonItem(draft, card.id, side, index, { text: value }))
                }
                onGraphic={(value) =>
                  onChange(
                    updateCardComparisonItem(draft, card.id, side, index, patchItemEmojiGraphic(value)),
                  )
                }
                onImageUrl={(value) =>
                  onChange(
                    updateCardComparisonItem(draft, card.id, side, index, patchItemUrlGraphic(value)),
                  )
                }
                onHighlight={(value) =>
                  onChange(
                    updateCardComparisonItem(draft, card.id, side, index, {
                      highlight: value || undefined,
                    }),
                  )
                }
                onCaption={(value) =>
                  onChange(
                    updateCardComparisonItem(draft, card.id, side, index, {
                      caption: value || undefined,
                    }),
                  )
                }
                onAlign={(value) =>
                  onChange(updateCardComparisonItem(draft, card.id, side, index, { align: value }))
                }
              />
            ))}
            {itemHint ? <EditorHint>{itemHint}</EditorHint> : null}
          </div>
        );
      })}
    </div>
  );
}

function BannerBodyEditor({ draft, card, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <EditorFieldLabel>Banner text</EditorFieldLabel>
        <EditorTextInput
          value={card.bannerText ?? ""}
          onChange={(value) => onChange(updateCardBannerText(draft, card.id, value))}
        />
      </div>
      <div>
        <EditorFieldLabel>Left content</EditorFieldLabel>
        <EditorTextInput
          value={card.leftSide?.content ?? ""}
          onChange={(value) =>
            onChange(updateCardSidePanel(draft, card.id, "leftSide", { content: value }))
          }
        />
      </div>
      <div>
        <EditorFieldLabel>Left example</EditorFieldLabel>
        <EditorTextInput
          value={card.leftSide?.example ?? ""}
          onChange={(value) =>
            onChange(
              updateCardSidePanel(draft, card.id, "leftSide", {
                example: value || undefined,
              }),
            )
          }
        />
      </div>
    </div>
  );
}

function FullWidthBodyEditor({ draft, card, onChange }: Props) {
  const items = card.items ?? [];
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <ItemFields
          key={index}
          label={`Item ${index + 1}`}
          text={item.text ?? ""}
          graphic={resolveItemEmoji(item)}
          imageUrl={resolveItemImageUrl(item)}
          highlight={item.highlight ?? ""}
          caption={item.caption ?? ""}
          align={resolveItemAlign(item)}
          onText={(value) => onChange(updateCardItem(draft, card.id, index, { text: value }))}
          onGraphic={(value) =>
            onChange(updateCardItem(draft, card.id, index, patchItemEmojiGraphic(value)))
          }
          onImageUrl={(value) =>
            onChange(updateCardItem(draft, card.id, index, patchItemUrlGraphic(value)))
          }
          onHighlight={(value) =>
            onChange(updateCardItem(draft, card.id, index, { highlight: value || undefined }))
          }
          onCaption={(value) =>
            onChange(updateCardItem(draft, card.id, index, { caption: value || undefined }))
          }
          onAlign={(value) =>
            onChange(updateCardItem(draft, card.id, index, { align: value }))
          }
        />
      ))}
      {items.length === 0 ?
        <p className="text-sm font-semibold text-kid-ink/50">No items on this card.</p>
      : null}
    </div>
  );
}

function PositiveNegativeBodyEditor({ draft, card, onChange }: Props) {
  const sides = [
    { key: "positiveSide" as const, label: "Positive side" },
    { key: "negativeSide" as const, label: "Negative side" },
  ];

  return (
    <div className="space-y-3">
      {sides.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <EditorSectionTitle>{label}</EditorSectionTitle>
          <div>
            <EditorFieldLabel>Title</EditorFieldLabel>
            <EditorTextInput
              value={card[key]?.title ?? ""}
              onChange={(value) =>
                onChange(updateCardSidePanel(draft, card.id, key, { title: value }))
              }
            />
          </div>
          <div>
            <EditorFieldLabel>Example</EditorFieldLabel>
            <EditorTextInput
              value={card[key]?.example ?? ""}
              onChange={(value) =>
                onChange(
                  updateCardSidePanel(draft, card.id, key, { example: value || undefined }),
                )
              }
            />
          </div>
          <div>
            <EditorFieldLabel>Formula</EditorFieldLabel>
            <EditorTextInput
              value={card[key]?.formula ?? ""}
              onChange={(value) =>
                onChange(
                  updateCardSidePanel(draft, card.id, key, { formula: value || undefined }),
                )
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreeColumnBodyEditor({ draft, card, onChange }: Props) {
  return <FullWidthBodyEditor draft={draft} card={card} onChange={onChange} />;
}

const SUMMARY_MARK_OPTIONS: { value: GrammarSummaryMark; label: string }[] = [
  { value: "check", label: "✓ Check" },
  { value: "cross", label: "✗ Cross" },
  { value: "dash", label: "— Dash" },
  { value: "text", label: "Text" },
];

function FourCardGridBodyEditor({ draft, card, onChange }: Props) {
  const miniCards = card.miniCards ?? [];

  return (
    <div className="space-y-3">
      {miniCards.map((mini, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-dashed border-kid-ink/15 p-2">
          <EditorSectionTitle>Mini card {index + 1}</EditorSectionTitle>
          <div>
            <EditorFieldLabel>Title</EditorFieldLabel>
            <EditorTextInput
              value={mini.title}
              onChange={(value) => onChange(updateMiniCard(draft, card.id, index, { title: value }))}
            />
          </div>
          <div>
            <EditorFieldLabel>Rule</EditorFieldLabel>
            <EditorTextInput
              value={mini.rule}
              onChange={(value) => onChange(updateMiniCard(draft, card.id, index, { rule: value }))}
            />
          </div>
          <div>
            <EditorFieldLabel>Formula</EditorFieldLabel>
            <EditorTextInput
              value={mini.formula ?? ""}
              onChange={(value) =>
                onChange(updateMiniCard(draft, card.id, index, { formula: value || undefined }))
              }
            />
          </div>
          <div>
            <EditorFieldLabel>Badge</EditorFieldLabel>
            <EditorTextInput
              value={mini.badge ?? ""}
              onChange={(value) =>
                onChange(updateMiniCard(draft, card.id, index, { badge: value || undefined }))
              }
            />
          </div>
          <div>
            <EditorFieldLabel>Theme</EditorFieldLabel>
            <select
              value={mini.theme ?? card.theme}
              onChange={(event) =>
                onChange(
                  updateMiniCard(draft, card.id, index, {
                    theme: event.target.value as typeof card.theme,
                  }),
                )
              }
              className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold"
            >
              {GRAMMAR_THEME_IDS.map((themeId) => (
                <option key={themeId} value={themeId}>
                  {themeId}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      {miniCards.length === 0 ?
        <p className="text-sm font-semibold text-kid-ink/50">No mini cards on this layout.</p>
      : null}
    </div>
  );
}

function SummaryGridBodyEditor({ draft, card, onChange }: Props) {
  const grid = card.summaryGrid;
  if (!grid) {
    return (
      <p className="text-sm font-semibold text-kid-ink/50">No summary grid data on this card.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <EditorSectionTitle>Columns</EditorSectionTitle>
        {grid.columns.map((column, colIndex) => (
          <div key={colIndex}>
            <EditorFieldLabel>Column {colIndex + 1}</EditorFieldLabel>
            <EditorTextInput
              value={column.label}
              onChange={(value) =>
                onChange(updateSummaryGridColumn(draft, card.id, colIndex, value))
              }
            />
          </div>
        ))}
      </div>

      {grid.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="space-y-2 rounded-lg border border-dashed border-kid-ink/15 p-2">
          <EditorSectionTitle>Row: {row.label}</EditorSectionTitle>
          <div>
            <EditorFieldLabel>Row label</EditorFieldLabel>
            <EditorTextInput
              value={row.label}
              onChange={(value) =>
                onChange(updateSummaryGridRowLabel(draft, card.id, rowIndex, value))
              }
            />
          </div>
          {row.cells.map((cell, colIndex) => (
            <div key={colIndex} className="space-y-2 border-t border-dashed border-kid-ink/10 pt-2">
              <EditorFieldLabel>
                Cell · {grid.columns[colIndex]?.label ?? `Col ${colIndex + 1}`}
              </EditorFieldLabel>
              <select
                value={cell.mark}
                onChange={(event) =>
                  onChange(
                    updateSummaryGridCell(draft, card.id, rowIndex, colIndex, {
                      mark: event.target.value as GrammarSummaryMark,
                    }),
                  )
                }
                className="w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold"
              >
                {SUMMARY_MARK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {cell.mark === "text" ?
                <>
                  <div>
                    <EditorFieldLabel>Text</EditorFieldLabel>
                    <EditorTextInput
                      value={cell.text ?? ""}
                      onChange={(value) =>
                        onChange(
                          updateSummaryGridCell(draft, card.id, rowIndex, colIndex, {
                            text: value || undefined,
                          }),
                        )
                      }
                    />
                  </div>
                  <div>
                    <EditorFieldLabel>Graphic</EditorFieldLabel>
                    <EditorTextInput
                      value={cell.graphic ?? ""}
                      onChange={(value) =>
                        onChange(
                          updateSummaryGridCell(draft, card.id, rowIndex, colIndex, {
                            graphic: value || undefined,
                          }),
                        )
                      }
                    />
                  </div>
                </>
              : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function GrammarPosterCardBodyPanel({ draft, card, onChange }: Props) {
  const kidTitleHint = getKidTitleHint(card.kidTitle);
  const glanceHint = getGlanceRuleHint(card.glanceRule?.text, draft.difficulty);

  let body: ReactNode;
  switch (card.layoutType) {
    case "two-equal":
      body = <TwoEqualBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "banner":
      body = <BannerBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "full-width":
      body = <FullWidthBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "three-column":
      body = <ThreeColumnBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "two-column-positive-negative":
      body = <PositiveNegativeBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "comparison":
      body = <TwoEqualBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "four-card-grid":
      body = <FourCardGridBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    case "summary-grid":
      body = <SummaryGridBodyEditor draft={draft} card={card} onChange={onChange} />;
      break;
    default:
      body = (
        <p className="text-sm font-semibold text-kid-ink/50">
          Body editing for <span className="font-mono">{card.layoutType}</span> is not available
          yet. Use the JSON panel or keep editing the source file.
        </p>
      );
  }

  return (
    <div className="space-y-3">
      {kidTitleHint ? <EditorHint>{kidTitleHint}</EditorHint> : null}
      {glanceHint ? <EditorHint>{glanceHint}</EditorHint> : null}
      {body}
    </div>
  );
}

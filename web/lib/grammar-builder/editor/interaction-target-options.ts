import type { GrammarCard, GrammarInteraction, GrammarModule } from "../schema";
import { buildInteractionTarget, interactionTargetKey } from "../interactions/resolve-interaction-target";

export type InteractionTargetOption = {
  value: string;
  label: string;
  target: GrammarInteraction["target"];
};

function optionKey(target: GrammarInteraction["target"]): string {
  return interactionTargetKey(target);
}

function addColumnOptions(
  options: InteractionTargetOption[],
  card: GrammarCard,
  side: "leftColumn" | "rightColumn",
  label: string,
) {
  const column = card[side];
  if (!column) {
    return;
  }
  options.push({
    value: optionKey(buildInteractionTarget(card.id, side)),
    label: `${label} (whole column)`,
    target: buildInteractionTarget(card.id, side),
  });
  column.items.forEach((_, index) => {
    const target = buildInteractionTarget(card.id, side, index);
    options.push({
      value: optionKey(target),
      label: `${label} · example ${index + 1}`,
      target,
    });
  });
}

export function getInteractionTargetOptions(card: GrammarCard): InteractionTargetOption[] {
  const options: InteractionTargetOption[] = [
    {
      value: optionKey(buildInteractionTarget(card.id, "card")),
      label: "Whole card",
      target: buildInteractionTarget(card.id, "card"),
    },
    {
      value: optionKey(buildInteractionTarget(card.id, "glanceRule")),
      label: "Glance rule",
      target: buildInteractionTarget(card.id, "glanceRule"),
    },
  ];

  switch (card.layoutType) {
    case "two-equal":
    case "comparison":
      addColumnOptions(options, card, "leftColumn", "Left column");
      addColumnOptions(options, card, "rightColumn", "Right column");
      break;
    case "banner":
      options.push({
        value: optionKey(buildInteractionTarget(card.id, "banner")),
        label: "Banner / remember strip",
        target: buildInteractionTarget(card.id, "banner"),
      });
      options.push({
        value: optionKey(buildInteractionTarget(card.id, "leftSide")),
        label: "Left side panel",
        target: buildInteractionTarget(card.id, "leftSide"),
      });
      break;
    case "full-width":
    case "three-column":
      card.items?.forEach((_, index) => {
        const target = buildInteractionTarget(card.id, "item", index);
        options.push({
          value: optionKey(target),
          label: `Item ${index + 1}`,
          target,
        });
      });
      break;
    case "two-column-positive-negative":
      options.push({
        value: optionKey(buildInteractionTarget(card.id, "positiveSide")),
        label: "Positive side",
        target: buildInteractionTarget(card.id, "positiveSide"),
      });
      options.push({
        value: optionKey(buildInteractionTarget(card.id, "negativeSide")),
        label: "Negative side",
        target: buildInteractionTarget(card.id, "negativeSide"),
      });
      break;
    case "four-card-grid":
      card.miniCards?.forEach((mini, index) => {
        const target = buildInteractionTarget(card.id, "miniCard", index);
        options.push({
          value: optionKey(target),
          label: `Mini card ${index + 1}: ${mini.title}`,
          target,
        });
      });
      break;
    case "summary-grid":
      card.summaryGrid?.rows.forEach((row, rowIndex) => {
        row.cells.forEach((_cell, colIndex) => {
          const columnLabel = card.summaryGrid?.columns[colIndex]?.label ?? `Col ${colIndex + 1}`;
          const target = buildInteractionTarget(card.id, "summaryCell", undefined, {
            rowIndex,
            colIndex,
          });
          options.push({
            value: optionKey(target),
            label: `${row.label} · ${columnLabel}`,
            target,
          });
        });
      });
      break;
    default:
      break;
  }

  return options;
}

export function formatInteractionTargetLabel(
  interaction: GrammarInteraction,
  card?: GrammarCard,
): string {
  const { target } = interaction;
  if (!card) {
    return `${target.region}${target.itemIndex !== undefined ? ` #${target.itemIndex + 1}` : ""}`;
  }
  const match = getInteractionTargetOptions(card).find(
    (option) => optionKey(option.target) === optionKey(target),
  );
  return match?.label ?? target.region;
}

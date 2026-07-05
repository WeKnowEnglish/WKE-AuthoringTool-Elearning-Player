import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import type { GrammarCard } from "../schema";
import { buildSectionBase } from "./map-section-base";

export function mapSummaryGridSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  const base = buildSectionBase(card, "summary_grid", options);
  const summaryGrid = card.summaryGrid;

  if (!summaryGrid) {
    throw new GrammarMapError("summary-grid layout requires summaryGrid", card.id);
  }

  return {
    ...base,
    summaryGrid: {
      columns: summaryGrid.columns.map((column) => ({ label: column.label })),
      rows: summaryGrid.rows.map((row) => ({
        label: row.label,
        cells: row.cells.map((cell) => ({
          mark: cell.mark,
          text: cell.text,
          graphic: cell.graphic,
        })),
      })),
    },
  };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { LAYOUT_LAB_BY_LAYOUT_TYPE, type LayoutLabIndexEntry } from "./layout-lab-index";
import { mapPosterSection } from "./map-poster-section";
import { parseGrammarModule } from "./validate-module";

const AUTHOR_DIR = join(process.cwd(), "docs/grammar-module/examples");

export type LayoutLabCardView = {
  entry: LayoutLabIndexEntry;
  section: PosterSection;
  sourceLabel: string;
};

export function loadLayoutLabCard(entry: LayoutLabIndexEntry): LayoutLabCardView {
  const filePath = join(AUTHOR_DIR, entry.fixturePath);
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  const module = parseGrammarModule(
    { ...raw, displayMode: "showcase" },
    { posterContentRules: false },
  );
  const card = module.cards.find((c) => c.id === entry.cardId);
  if (!card) {
    throw new Error(
      `Layout lab card ${entry.cardId} not found in ${entry.fixturePath} (${entry.layoutType})`,
    );
  }

  return {
    entry,
    section: mapPosterSection(card, { requireKidTitle: false, requireGlanceRule: false }),
    sourceLabel: entry.fixturePath,
  };
}

export function loadAllLayoutLabCards(): LayoutLabCardView[] {
  return LAYOUT_LAB_BY_LAYOUT_TYPE.map((entry) => loadLayoutLabCard(entry));
}

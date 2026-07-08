import { LAYOUT_LAB_BY_LAYOUT_TYPE } from "../layout-lab-index";
import type { GrammarCard, GrammarLayoutType } from "../schema";
import { parseGrammarModule } from "../validate-module";
import { getLayoutLabFixtureJson } from "./layout-lab-fixture-registry";

export function getLayoutTypeScaffold(layoutType: GrammarLayoutType): GrammarCard {
  const entry = LAYOUT_LAB_BY_LAYOUT_TYPE.find((item) => item.layoutType === layoutType);
  if (!entry) {
    throw new Error(`No layout lab scaffold for layoutType: ${layoutType}`);
  }

  const raw = getLayoutLabFixtureJson(entry.fixturePath);
  const module = parseGrammarModule(
    { ...(raw as object), displayMode: "showcase" },
    { posterContentRules: false },
  );
  const card = module.cards.find((item) => item.id === entry.cardId);
  if (!card) {
    throw new Error(
      `Scaffold card ${entry.cardId} not found in ${entry.fixturePath} (${layoutType})`,
    );
  }

  return structuredClone(card);
}

export function mergeCardLayoutScaffold(
  current: GrammarCard,
  layoutType: GrammarLayoutType,
): GrammarCard {
  const scaffold = getLayoutTypeScaffold(layoutType);
  return {
    ...scaffold,
    id: current.id,
    title: current.title,
    kidTitle: current.kidTitle,
    kidSubtitle: current.kidSubtitle,
    theme: current.theme,
    glanceRule: current.glanceRule,
    layoutType,
  };
}

export const LAYOUT_TYPE_OPTIONS = LAYOUT_LAB_BY_LAYOUT_TYPE.map((entry) => ({
  value: entry.layoutType,
  label: entry.label,
  description: entry.description,
}));

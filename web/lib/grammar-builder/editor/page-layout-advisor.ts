import type { GrammarModule } from "../schema";
import { updateModulePageLayoutWithRows } from "./grammar-card-structure-mutations";

export type PageLayoutAdvice = {
  severity: "ok" | "warn" | "error";
  message: string;
  suggestedPageLayout?: GrammarModule["pageLayout"];
};

export function advisePageLayout(module: GrammarModule): PageLayoutAdvice[] {
  const count = module.cards.length;
  const advice: PageLayoutAdvice[] = [];

  switch (module.pageLayout) {
    case "two-equal-then-full":
      if (count < 3) {
        advice.push({
          severity: "warn",
          message: "This layout works best with 3 cards (two side by side, then one full width).",
          suggestedPageLayout: count === 2 ? "two-equal" : "single-column",
        });
      } else if (count > 3) {
        advice.push({
          severity: "warn",
          message: `Only the first two cards share a row; cards 3+ each get a full row (${count} cards total).`,
          suggestedPageLayout: "two-by-two-then-full",
        });
      }
      break;
    case "two-by-two-then-full":
      if (count < 5) {
        advice.push({
          severity: "warn",
          message: "This layout works best with 5 cards (2×2 grid, then one full-width summary).",
          suggestedPageLayout: count <= 3 ? "two-equal-then-full" : "two-equal",
        });
      } else if (count > 5) {
        advice.push({
          severity: "warn",
          message: "Cards after the first four use full-width rows.",
          suggestedPageLayout: "four-card-grid-then-split",
        });
      }
      break;
    case "four-card-grid-then-split":
      if (count !== 6) {
        advice.push({
          severity: "warn",
          message: "This layout works best with exactly 6 cards (four mini, then two wide).",
        });
      }
      break;
    case "two-equal":
      if (count === 1) {
        advice.push({
          severity: "warn",
          message: "A single card may look better in single-column layout.",
          suggestedPageLayout: "single-column",
        });
      }
      break;
    case "custom":
      if (!module.customRows?.length) {
        advice.push({
          severity: "error",
          message: "Custom page layout requires at least one row.",
        });
      }
      break;
    default:
      break;
  }

  if (advice.length === 0) {
    advice.push({
      severity: "ok",
      message: "Page layout matches card count.",
    });
  }

  return advice;
}

export function applySuggestedPageLayout(
  module: GrammarModule,
  suggestedPageLayout: GrammarModule["pageLayout"],
): GrammarModule {
  return updateModulePageLayoutWithRows(module, suggestedPageLayout);
}

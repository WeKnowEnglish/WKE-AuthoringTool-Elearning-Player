import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/short-answers-there-is-author.json",
);

describe("mapPosterModule short answers author fixture", () => {
  it("maps short-answers-there-is-author.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(module.displayMode).toBe("showcase");
    expect(view.sections).toHaveLength(3);
    expect(view.sections[0]?.internalLayout).toBe("positive_negative");
    expect(view.sections[0]?.positivePanel?.example).toBe("Yes, there is.");
    expect(view.sections[1]?.internalLayout).toBe("positive_negative");
    expect(view.sections[1]?.negativePanel?.example).toBe("No, there aren't.");
    expect(view.sections[2]?.internalLayout).toBe("summary_grid");
    expect(view.sections[2]?.summaryGrid?.rows).toHaveLength(2);
  });
});

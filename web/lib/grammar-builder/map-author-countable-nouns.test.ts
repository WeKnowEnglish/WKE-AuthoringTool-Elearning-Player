import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/countable-nouns-author-excerpt.json",
);

describe("mapPosterModule countable nouns excerpt", () => {
  it("maps countable-nouns-author-excerpt.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(view.sections).toHaveLength(2);
    expect(view.sections[1]?.internalLayout).toBe("four_card_grid");
    expect(view.sections[1]?.miniCards).toHaveLength(4);
  });
});

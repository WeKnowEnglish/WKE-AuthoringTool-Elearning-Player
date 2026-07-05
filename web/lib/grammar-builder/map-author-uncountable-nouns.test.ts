import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/uncountable-nouns-author.json",
);

describe("mapPosterModule uncountable nouns author fixture", () => {
  it("maps uncountable-nouns-author.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(view.sections).toHaveLength(3);
    expect(view.sections[0]?.goodBadPair?.good.sentence).toContain("How much");
    expect(view.sections[0]?.goodBadPair?.bad.sentence).toContain("How many");
    expect(view.sections[2]?.internalLayout).toBe("banner");
  });
});

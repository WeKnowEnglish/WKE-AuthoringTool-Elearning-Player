import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/plural-pronunciation-author.json",
);

describe("mapPosterModule plural pronunciation author fixture", () => {
  it("maps plural-pronunciation-author.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(module.pageLayout).toBe("two-equal");
    expect(view.sections).toHaveLength(3);
    expect(view.sections[0]?.columns?.[0]?.transformationRow?.ipa).toBe("/s/");
    expect(view.sections[2]?.columns?.[2]?.transformationRow?.to).toBe("boxes");
  });
});

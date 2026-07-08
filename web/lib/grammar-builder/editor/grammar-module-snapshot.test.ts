import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import { formatGrammarModuleJson } from "./export-grammar-module";
import { grammarModuleSnapshot, isGrammarModuleDirty } from "./grammar-module-snapshot";
import { parseGrammarModule } from "../validate-module";
import { updateModulePageLayout } from "./grammar-module-mutations";

describe("grammar-module-snapshot", () => {
  const module = parseGrammarModule(questionsJson, { posterContentRules: false });

  it("detects dirty state after mutation", () => {
    const snapshot = grammarModuleSnapshot(module);
    const changed = updateModulePageLayout(module, "single-column");
    expect(isGrammarModuleDirty(module, snapshot)).toBe(false);
    expect(isGrammarModuleDirty(changed, snapshot)).toBe(true);
  });
});

describe("export-grammar-module", () => {
  it("formats JSON with trailing newline", () => {
    const module = parseGrammarModule(questionsJson, { posterContentRules: false });
    const formatted = formatGrammarModuleJson(module);
    expect(formatted.endsWith("\n")).toBe(true);
    expect(formatted).toContain('"moduleTitle"');
  });
});

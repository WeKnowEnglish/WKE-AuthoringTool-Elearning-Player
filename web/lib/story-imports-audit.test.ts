import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { parseScreenPayload } from "./lesson-schemas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importsDir = path.join(__dirname, "../content/story-imports");

function screensFromImportJson(raw: unknown): { screen_type: string; payload: unknown }[] {
  if (
    raw &&
    typeof raw === "object" &&
    "screens" in raw &&
    Array.isArray((raw as { screens: unknown }).screens)
  ) {
    return (raw as { screens: { screen_type: string; payload: unknown }[] }).screens;
  }
  if (raw && typeof raw === "object" && (raw as { type?: string }).type === "story") {
    return [{ screen_type: "story", payload: raw }];
  }
  throw new Error("Unrecognized import JSON shape (expected { screens } or story payload)");
}

describe("content/story-imports JSON audit", () => {
  const files = readdirSync(importsDir).filter((f) => f.endsWith(".json"));

  it("finds at least one fixture file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: screens parse against lesson schemas`, () => {
      const parsedJson: unknown = JSON.parse(readFileSync(path.join(importsDir, file), "utf8"));
      const screens = screensFromImportJson(parsedJson);
      expect(screens.length).toBeGreaterThan(0);
      screens.forEach((s, i) => {
        const p = parseScreenPayload(s.screen_type, s.payload);
        expect(p, `screen ${i} type=${s.screen_type}`).not.toBeNull();
      });
    });
  }
});

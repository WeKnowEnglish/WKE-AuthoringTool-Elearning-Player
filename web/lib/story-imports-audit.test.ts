import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import type { LessonScreenRow } from "@/lib/data/catalog";
import { getLessonPublishBlockingReasons } from "./lesson-editor-checklist";
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

/** Story-only fixtures get a synthetic Start so publish rules match full-lesson imports. */
function withSyntheticStartIfNeeded(
  screens: { screen_type: string; payload: unknown }[],
): { screen_type: string; payload: unknown }[] {
  if (screens.some((s) => s.screen_type === "start")) return screens;
  return [
    {
      screen_type: "start",
      payload: {
        type: "start",
        cta_label: "Start",
        image_url: "https://placehold.co/800x520/e5e5e5/333?text=Audit",
      },
    },
    ...screens,
  ];
}

describe("content/story-imports JSON audit", () => {
  const files = readdirSync(importsDir).filter((f) => f.endsWith(".json"));

  it("finds at least one fixture file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: screens parse and satisfy publish blocking rules`, () => {
      const parsedJson: unknown = JSON.parse(readFileSync(path.join(importsDir, file), "utf8"));
      const screens = screensFromImportJson(parsedJson);
      expect(screens.length).toBeGreaterThan(0);
      const forPublish = withSyntheticStartIfNeeded(screens);
      forPublish.forEach((s, i) => {
        const p = parseScreenPayload(s.screen_type, s.payload);
        expect(p, `screen ${i} type=${s.screen_type}`).not.toBeNull();
      });
      const rows: LessonScreenRow[] = forPublish.map((s, i) => ({
        id: `audit-${file}-${i}`,
        lesson_id: "audit-lesson",
        order_index: i,
        screen_type: s.screen_type,
        payload: s.payload,
      }));
      const blocking = getLessonPublishBlockingReasons(rows);
      expect(blocking, `blocking reasons for ${file}: ${blocking.join("; ")}`).toEqual([]);
    });
  }
});

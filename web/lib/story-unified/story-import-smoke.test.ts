import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getNormalizedStoryPages, storyPayloadSchema } from "@/lib/lesson-schemas";
import { buildUnifiedReactionsFromStoryPage } from "@/lib/story-unified/build-unified-reactions";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMagicHouseLesson(): unknown {
  const path = join(__dirname, "../../sample-imports/magic-house-lesson-import.json");
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

describe("story import smoke (unified IR)", () => {
  it("magic-house: every story page compiles without parse errors", () => {
    const lesson = loadMagicHouseLesson() as {
      screens?: Array<{ screen_type?: string; payload?: unknown }>;
    };
    const storyScreens = (lesson.screens ?? []).filter((s) => s.screen_type === "story");
    expect(storyScreens.length).toBeGreaterThan(0);

    for (const s of storyScreens) {
      const parsed = storyPayloadSchema.safeParse(s.payload);
      expect(parsed.success, JSON.stringify(parsed.error?.format(), null, 2)).toBe(true);
      if (!parsed.success) continue;
      const pages = getNormalizedStoryPages(parsed.data);
      for (const page of pages) {
        const { parseErrors, issues } = buildUnifiedReactionsFromStoryPage(page);
        expect(parseErrors, `parseErrors on page ${page.id}`).toEqual([]);
        const hard = issues.filter((i) => i.level === "error");
        expect(hard, `validation errors on page ${page.id}: ${hard.map((x) => x.message).join("; ")}`).toEqual(
          [],
        );
      }
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { PILOT_POSTER_FIXTURE_PATH } from "./fixture-path";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const EXPECTED_SECTIONS: Pick<
  PosterSection,
  | "number"
  | "kidTitle"
  | "kidSubtitle"
  | "glanceRule"
  | "internalLayout"
  | "leftLabel"
  | "leftEmoji"
  | "rightLabel"
  | "leftExamples"
  | "rightExamples"
  | "rememberBanner"
>[] = [
  {
    number: 1,
    kidTitle: "Is there…?",
    kidSubtitle: "One thing",
    glanceRule: { text: "Is there = one thing?", highlight: "one thing" },
    internalLayout: "two_equal",
    leftLabel: "SINGULAR",
    leftEmoji: "⭐",
    leftExamples: [
      {
        sentence: "Is there a book on the desk?",
        highlight: "Is there",
        emoji: "📘",
      },
    ],
    rightLabel: "UNCOUNTABLE",
    rightEmoji: "💧",
    rightExamples: [
      {
        sentence: "Is there any milk?",
        highlight: "Is there",
        emoji: "🥛",
      },
    ],
  },
  {
    number: 2,
    kidTitle: "Are there…?",
    kidSubtitle: "Many things",
    glanceRule: { text: "Are there = many things?", highlight: "many things" },
    internalLayout: "two_equal_narrow",
    leftLabel: "PLURAL",
    leftEmoji: "👧👦",
    leftExamples: [
      {
        sentence: "ANY",
        emoji: "👧👦👧👦",
        label: "people",
      },
    ],
    rightExamples: [
      {
        sentence: "Are there any chairs in the room?",
        highlight: "Are there",
        emoji: "🪑",
      },
    ],
  },
  {
    number: 3,
    kidTitle: "Remember!",
    glanceRule: { text: "Put Is or Are first!", highlight: "Is or Are" },
    internalLayout: "banner",
    rememberBanner: {
      title: "Remember!",
      body: "Put Is or Are before There.",
      highlight: "Is or Are first",
    },
  },
];

function loadMappedPoster() {
  const raw = JSON.parse(readFileSync(PILOT_POSTER_FIXTURE_PATH, "utf8"));
  return mapPosterModule(parseGrammarModule(raw));
}

describe("mapPosterModule", () => {
  it("maps the A1 fixture to three poster sections", () => {
    const view = loadMappedPoster();

    expect(view.pageLayout).toBe("two-equal-then-full");
    expect(view.sections).toHaveLength(3);
    expect(view.hero.highlightA.text).toBe("THERE IS");
    expect(view.hero.highlightB.text).toBe("THERE ARE");
  });

  it("matches expected poster section semantics", () => {
    const view = loadMappedPoster();

    view.sections.forEach((mapped, index) => {
      const expected = EXPECTED_SECTIONS[index]!;

      expect(mapped.layoutType).toBe(index === 2 ? "banner" : "two-equal");
      expect(mapped.internalLayout).toBe(expected.internalLayout);
      expect(mapped.number).toBe(expected.number);
      expect(mapped.kidTitle).toBe(expected.kidTitle);
      expect(mapped.kidSubtitle).toBe(expected.kidSubtitle);
      expect(mapped.glanceRule).toEqual(expected.glanceRule);
      expect(mapped.leftLabel).toBe(expected.leftLabel);
      expect(mapped.leftEmoji).toBe(expected.leftEmoji);
      expect(mapped.rightLabel).toBe(expected.rightLabel);
      expect(mapped.leftExamples).toEqual(expected.leftExamples);
      expect(mapped.rightExamples).toEqual(expected.rightExamples);
      expect(mapped.rememberBanner).toEqual(expected.rememberBanner);
    });
  });
});

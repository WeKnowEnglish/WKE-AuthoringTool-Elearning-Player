import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapFullWidthSection } from "./map-poster-section/map-full-width-section";

describe("mapFullWidthSection", () => {
  it("maps stacked items", () => {
    const section = mapFullWidthSection(
      {
        id: 1,
        title: "Rule",
        kidTitle: "Add -s",
        theme: "sky-blue",
        layoutType: "full-width",
        glanceRule: { text: "Most nouns + s" },
        items: [{ text: "book → books", graphic: "📘" }],
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("full_width");
    expect(section.stackedExamples).toHaveLength(1);
    expect(section.stackedExamples?.[0]?.sentence).toBe("book → books");
  });

  it("throws when items are missing", () => {
    expect(() =>
      mapFullWidthSection(
        {
          id: 1,
          title: "Rule",
          theme: "sky-blue",
          layoutType: "full-width",
        } as Parameters<typeof mapFullWidthSection>[0],
        { requireKidTitle: false, requireGlanceRule: false },
      ),
    ).toThrow(GrammarMapError);
  });
});

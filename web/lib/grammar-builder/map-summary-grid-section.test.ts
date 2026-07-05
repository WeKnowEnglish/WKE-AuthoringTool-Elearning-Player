import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapSummaryGridSection } from "./map-poster-section/map-summary-grid-section";

describe("mapSummaryGridSection", () => {
  it("maps summary grid columns and rows", () => {
    const section = mapSummaryGridSection(
      {
        id: 1,
        title: "Summary",
        kidTitle: "Summary",
        theme: "lavender",
        layoutType: "summary-grid",
        glanceRule: { text: "Some or Any?" },
        summaryGrid: {
          columns: [{ label: "SOME" }, { label: "ANY" }],
          rows: [
            {
              label: "Affirmative",
              cells: [{ mark: "check" }, { mark: "cross" }],
            },
          ],
        },
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("summary_grid");
    expect(section.summaryGrid?.columns).toHaveLength(2);
    expect(section.summaryGrid?.rows[0]?.cells[0]?.mark).toBe("check");
  });

  it("throws when summaryGrid is missing", () => {
    expect(() =>
      mapSummaryGridSection(
        {
          id: 1,
          title: "Summary",
          theme: "lavender",
          layoutType: "summary-grid",
        } as Parameters<typeof mapSummaryGridSection>[0],
        { requireKidTitle: false, requireGlanceRule: false },
      ),
    ).toThrow(GrammarMapError);
  });
});

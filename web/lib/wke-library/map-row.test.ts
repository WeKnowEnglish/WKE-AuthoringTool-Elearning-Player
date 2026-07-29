import { describe, expect, it } from "vitest";
import { mapWkeLibrarySummary } from "@/lib/wke-library/map-row";

describe("mapWkeLibrarySummary", () => {
  it("maps db row to summary", () => {
    const summary = mapWkeLibrarySummary({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "cover-and-explore",
      format: "explore_hotspots",
      title: "Cover + Explore starter",
      description: "Two scenes",
      cefr: "A1",
      tags: ["starter"],
      status: "published",
      cover_image_url: null,
      sort_order: 10,
      updated_at: "2026-07-30T00:00:00.000Z",
    });
    expect(summary.slug).toBe("cover-and-explore");
    expect(summary.format).toBe("explore_hotspots");
    expect(summary.tags).toEqual(["starter"]);
    expect(summary.creditName).toBeNull();
    expect(summary.status).toBe("published");
  });
});

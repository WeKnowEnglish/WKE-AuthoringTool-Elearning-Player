import { describe, expect, it } from "vitest";
import mia from "@/public/wke-library/explore-hotspots/mias-morning.wkeactivity.json";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";

describe("Mia's Morning published unit", () => {
  it("uses Mia-specific learning metadata and accessible scene descriptions", () => {
    const activity = validateExploreHotspotsDocument(mia);
    const text = JSON.stringify(activity).toLowerCase();
    expect(activity.id).toBe("mias-morning");
    expect(activity.educationalIntent.objective).toContain("morning routine");
    expect(activity.content.completionMessage).toContain("ready for school");
    expect(text).not.toContain("choose a child to hear about their hobby");
    expect(text).not.toContain("four children drawing");
    expect(text).not.toContain('"title":"beroom 1"');
  });
});

import { describe, expect, it } from "vitest";
import hobbiesActivity from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { parseScreenPayload } from "@/lib/lesson-schemas";
import {
  geometryToHitPoints,
  parseWkeActivity,
  pointInPolygon,
  polygonBounds,
  safeParseWkeActivity,
  wkeActivityToExploreHotspotsPayload,
  wkeActivityToLessonScreen,
} from "@/lib/wke-activity";

describe("wke-activity geometry", () => {
  it("computes polygon bounds", () => {
    const bounds = polygonBounds([
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.4, y: 0.6 },
      { x: 0.1, y: 0.6 },
    ]);
    expect(bounds.x).toBeCloseTo(0.1);
    expect(bounds.y).toBeCloseTo(0.2);
    expect(bounds.w).toBeCloseTo(0.3);
    expect(bounds.h).toBeCloseTo(0.4);
  });

  it("detects points inside a polygon", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, square)).toBe(false);
  });

  it("converts rectangle and ellipse geometry to hit points", () => {
    expect(
      geometryToHitPoints({
        shape: "rectangle",
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      }),
    ).toHaveLength(4);
    expect(
      geometryToHitPoints({
        shape: "ellipse",
        cx: 0.5,
        cy: 0.5,
        rx: 0.2,
        ry: 0.1,
      }).length,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("wke-activity hobbies fixture", () => {
  it("parses the studio export", () => {
    const activity = parseWkeActivity(hobbiesActivity);
    expect(activity.id).toBe("hobbies-listening-hotspots");
    expect(activity.interaction.type).toBe("explore-hotspots");
    expect(activity.interaction.dialogues).toHaveLength(4);
  });

  it("rejects wrong kind", () => {
    const result = safeParseWkeActivity({ ...hobbiesActivity, kind: "lesson" });
    expect(result.success).toBe(false);
  });

  it("maps to explore_hotspots and passes parseScreenPayload", () => {
    const payload = wkeActivityToExploreHotspotsPayload(hobbiesActivity);
    expect(payload.subtype).toBe("explore_hotspots");
    expect(payload.hotspots).toHaveLength(4);
    expect(payload.image_url).toContain("hobbies-and-likes-classroom.png");
    expect(payload.hotspots.every((h) => (h.visual_shape?.paths.length ?? 0) > 0)).toBe(true);

    const row = wkeActivityToLessonScreen(hobbiesActivity, "activity-test");
    const parsed = parseScreenPayload(row.screen_type, row.payload);
    expect(parsed?.type).toBe("interaction");
    if (parsed?.type === "interaction") {
      expect(parsed.subtype).toBe("explore_hotspots");
    }
  });

  it("maps rectangle and ellipse hotspots from Studio exports", () => {
    const mixed = structuredClone(hobbiesActivity) as Record<string, unknown>;
    const layout = mixed.layout as {
      elements: Array<Record<string, unknown>>;
    };
    const hotspots = layout.elements.filter((el) => el.kind === "hotspot");
    expect(hotspots.length).toBeGreaterThanOrEqual(3);
    hotspots[1]!.geometry = {
      shape: "rectangle",
      x: 0.35,
      y: 0.2,
      width: 0.18,
      height: 0.45,
    };
    hotspots[2]!.geometry = {
      shape: "ellipse",
      cx: 0.62,
      cy: 0.48,
      rx: 0.1,
      ry: 0.22,
    };

    const payload = wkeActivityToExploreHotspotsPayload(mixed);
    expect(payload.hotspots[1]?.points.length).toBe(4);
    expect(payload.hotspots[2]?.points.length).toBeGreaterThanOrEqual(3);
  });
});

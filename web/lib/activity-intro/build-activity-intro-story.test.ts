import { describe, expect, it } from "vitest";
import {
  activityIntroToLessonScreen,
  buildActivityIntroStory,
  FOOD_BAKERY_ACTIVITY_INTRO,
  FOOD_BAKERY_HOST_CHARACTER_URL,
  FOOD_BAKERY_STAGE_COLOR,
} from "@/lib/activity-intro";
import { parseScreenPayload } from "@/lib/lesson-schemas";

describe("buildActivityIntroStory", () => {
  it("builds a comic-stage 2-page food bakery intro", () => {
    const payload = buildActivityIntroStory(FOOD_BAKERY_ACTIVITY_INTRO);
    expect(payload.type).toBe("story");
    expect(payload.layout_mode).toBe("slide");
    expect(payload.pages).toHaveLength(2);

    const [page1, page2] = payload.pages!;
    expect(page1.background_color).toBe(FOOD_BAKERY_STAGE_COLOR);
    expect(page1.background_image_url).toBeUndefined();
    expect(page1.items.some((i) => i.kind === "text")).toBe(true);
    expect(page1.items.some((i) => i.kind === "shape")).toBe(true);

    const page1Images = page1.items.filter((i) => (i.kind ?? "image") === "image");
    const page2Images = page2.items.filter((i) => (i.kind ?? "image") === "image");
    expect(page1Images.some((i) => i.image_url === FOOD_BAKERY_HOST_CHARACTER_URL)).toBe(
      true,
    );
    expect(page1Images.filter((i) => i.name !== "Host")).toHaveLength(2);
    expect(page2Images.filter((i) => i.name !== "Host").map((i) => i.name)).toEqual([
      "bread",
      "milk",
      "eggs",
      "jam",
    ]);
  });

  it("passes parseScreenPayload as a story screen", () => {
    const row = activityIntroToLessonScreen(FOOD_BAKERY_ACTIVITY_INTRO);
    const parsed = parseScreenPayload(row.screen_type, row.payload);
    expect(parsed?.type).toBe("story");
  });

  it("attaches idle loops to food words and host", () => {
    const payload = buildActivityIntroStory(FOOD_BAKERY_ACTIVITY_INTRO);
    const images = payload.pages![1]!.items.filter((i) => (i.kind ?? "image") === "image");
    expect(images.every((i) => (i.idle_animations?.length ?? 0) > 0)).toBe(true);
  });
});

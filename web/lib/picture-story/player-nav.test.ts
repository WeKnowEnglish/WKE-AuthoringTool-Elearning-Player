import { describe, expect, it } from "vitest";
import { pictureStoryFrameNav } from "@/lib/picture-story/player-nav";

describe("pictureStoryFrameNav", () => {
  it("hides paging for a single picture", () => {
    const nav = pictureStoryFrameNav(1, 0);
    expect(nav.single).toBe(true);
    expect(nav.showPager).toBe(false);
    expect(nav.isLast).toBe(true);
    expect(nav.pageLabel).toBe("Look at the picture");
    expect(nav.reviewPageLabel).toBe("Story picture");
    expect(nav.overviewLine).toBe("Look at the picture.");
    expect(nav.lookAgainLabel).toBe("Look at the picture again");
    expect(nav.backToFramesLabel).toBe("Back to picture");
  });

  it("pages through a multi-picture story", () => {
    const first = pictureStoryFrameNav(3, 0);
    expect(first.showPager).toBe(true);
    expect(first.isFirst).toBe(true);
    expect(first.isLast).toBe(false);
    expect(first.pageLabel).toBe("Page 1 of 3");

    const last = pictureStoryFrameNav(3, 2);
    expect(last.isLast).toBe(true);
    expect(last.pageLabel).toBe("Page 3 of 3");
    expect(last.overviewCue).toBe("Look at each picture. Then answer.");
    expect(last.lookAgainLabel).toBe("Look at the story again");
    expect(last.backToFramesLabel).toBe("Back to story");
  });
});

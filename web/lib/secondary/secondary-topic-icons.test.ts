import { describe, expect, it } from "vitest";
import {
  emojiToTwemojiAssetUrl,
  getSecondaryTopicIconUrl,
  getSecondaryTopicEmoji,
} from "@/lib/secondary/secondary-topic-icons";

describe("secondary-topic-icons", () => {
  it("maps school-life to a twemoji book asset", () => {
    expect(getSecondaryTopicEmoji("school-life")).toBe("📚");
    expect(getSecondaryTopicIconUrl("school-life")).toContain("twemoji");
    expect(getSecondaryTopicIconUrl("school-life")).toContain(".png");
  });

  it("falls back for unknown topics", () => {
    expect(getSecondaryTopicEmoji("unknown-topic")).toBe("📖");
    expect(getSecondaryTopicIconUrl("unknown-topic")).toContain("twemoji");
  });

  it("builds stable twemoji codepoint paths", () => {
    expect(emojiToTwemojiAssetUrl("🗺️")).toContain("/1f5fa.png");
  });
});

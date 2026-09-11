import { describe, expect, it } from "vitest";
import {
  activityItemCount,
  activityItemNoun,
  focusedHomeworkCollectionPreview,
  seedBlankGradedCollection,
  seedGradedPartFromKind,
} from "@/lib/activity-tracks";

describe("focusedHomeworkCollectionPreview", () => {
  it("returns the focused homework part so authoring preview can run without a full freeze", () => {
    const draft = seedBlankGradedCollection({
      trackId: "preview-picture-story",
      title: "Look and answer",
      level: "primary",
    });
    const pictureStory = seedGradedPartFromKind({
      kind: "picture_story",
      order: 1,
      level: "primary",
    });
    draft.parts = [pictureStory!];

    expect(focusedHomeworkCollectionPreview(draft, null)).toBeNull();
    const preview = focusedHomeworkCollectionPreview(draft, pictureStory!.id);
    expect(preview?.parts).toHaveLength(1);
    expect(preview?.parts[0]?.kind).toBe("document_module");
    if (preview?.parts[0]?.kind !== "document_module") return;
    expect(preview.parts[0].moduleFormat).toBe("picture_story");
    expect(activityItemNoun(pictureStory!)).toBe("question");
    expect(activityItemCount(pictureStory!)).toBe(
      Array.isArray(preview.parts[0].document.questions)
        ? preview.parts[0].document.questions.length
        : 0,
    );
  });
});

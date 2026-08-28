import { describe, expect, it } from "vitest";
import {
  renumberParts,
  seedBlankGradedCollection,
  seedGradedFromTemplate,
  seedGradedPartFromKind,
} from "@/lib/activity-tracks";
import {
  freezeGradedTrackHomeworkPayload,
  parseGradedTrackFreezeDocument,
} from "@/lib/class-homework/freeze-graded-track";
import { resolveGradedTrackSegments } from "@/lib/graded-tracks/resolve-segments";

describe("resolveGradedTrackSegments", () => {
  it("preserves authored order for mixed primary template and collection parts", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-mixed-order",
      title: "Mixed homework",
      templateId: "homework-template-one",
    });
    const letters = seedGradedPartFromKind({
      kind: "letter_mixup",
      order: draft.parts.length + 1,
      level: "primary",
    });
    const response = seedGradedPartFromKind({
      kind: "free_response",
      order: draft.parts.length + 2,
      level: "primary",
    });
    draft.parts = renumberParts([
      draft.parts[0]!,
      letters!,
      draft.parts[1]!,
      response!,
      ...draft.parts.slice(2),
    ]);

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    expect(freeze).toBeTruthy();

    const segments = resolveGradedTrackSegments(freeze!);
    expect(segments).toHaveLength(draft.parts.length);
    expect(segments.map((segment) => segment.type)).toEqual([
      "primary_template",
      "collection",
      "primary_template",
      "collection",
      "primary_template",
      "primary_template",
      "primary_template",
      "primary_template",
    ]);
    expect(segments[1]?.type === "collection" && segments[1].part.kind).toBe(
      "letter_mixup",
    );
    expect(segments[3]?.type === "collection" && segments[3].part.kind).toBe(
      "free_response",
    );
  });

  it("resolves collection-only graded tracks", () => {
    const listen = seedGradedPartFromKind({
      kind: "listen_and_choose",
      order: 1,
      level: "secondary",
    });
    const draft = seedGradedFromTemplate({
      trackId: "track-collection-only",
      title: "Collection only",
      templateId: "secondary-homework-template-one",
      preset: "blank",
    });
    draft.parts = [listen!];

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    const segments = resolveGradedTrackSegments(freeze!);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.type).toBe("collection");
  });
});

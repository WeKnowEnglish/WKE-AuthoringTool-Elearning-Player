import { describe, expect, it } from "vitest";
import {
  seedBlankGradedCollection,
  seedGradedPartFromKind,
} from "@/lib/activity-tracks/seed-graded";
import { buildGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";

describe("creative presentation Track Builder activity", () => {
  it("seeds, saves, and freezes the VLOG demo for secondary homework", () => {
    const document = seedBlankGradedCollection({
      trackId: "track-vlog",
      title: "VLOG homework",
      level: "secondary",
    });
    const part = seedGradedPartFromKind({
      kind: "creative_presentation",
      order: 1,
      level: "secondary",
    });
    expect(part?.source.type).toBe("homework_part");
    if (!part || part.source.type !== "homework_part") return;
    expect(part.source.part).toMatchObject({
      kind: "creative_presentation",
      title: "Plan your VLOG",
      templateId: "vlog-plan-v1",
    });

    document.parts = [part];
    const freeze = buildGradedTrackFreezeDocument(document);
    expect(freeze.level).toBe("secondary");
    expect(freeze.collectionDocument?.parts[0]).toMatchObject({
      kind: "creative_presentation",
      maxPoints: 20,
    });
    expect(freeze.gradingManifest?.parts[0]).toMatchObject({
      format: "creative_presentation",
      gradingPolicy: "teacher_review",
      maxScore: 20,
    });
  });
});

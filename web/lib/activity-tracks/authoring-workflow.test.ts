import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVITY_TRACK_DESIGN,
  DEFAULT_ACTIVITY_TRACK_SUPPORT,
  activityItemCount,
  activityItemNoun,
  collectTrackMediaUsages,
  seedBlankGradedCollection,
  seedGradedFromTemplate,
  seedGradedPartFromKind,
  trackMediaIssues,
  trackScoringParts,
} from "@/lib/activity-tracks";
import { parseActivityTrackDocument } from "@/lib/activity-tracks/parse-document";
import {
  freezeGradedTrackHomeworkPayload,
  parseGradedTrackFreezeDocument,
} from "@/lib/class-homework/freeze-graded-track";

describe("Learning Track authoring workflow", () => {
  it("opens older version-one drafts with safe workflow defaults", () => {
    const current = seedBlankGradedCollection({
      trackId: "old-track",
      title: "Existing track",
      level: "primary",
    });
    const oldDraft = structuredClone(current) as unknown as Record<string, unknown>;
    delete oldDraft.topic;
    delete oldDraft.description;
    delete oldDraft.support;
    delete oldDraft.design;

    const parsed = parseActivityTrackDocument(oldDraft);
    expect(parsed).not.toBeNull();
    expect(parsed?.topic).toBe("");
    expect(parsed?.description).toBe("");
    expect(parsed?.support).toEqual(DEFAULT_ACTIVITY_TRACK_SUPPORT);
    expect(parsed?.design).toEqual(DEFAULT_ACTIVITY_TRACK_DESIGN);
  });

  it("freezes the authored setup, support, media, and design for students", () => {
    const draft = seedGradedFromTemplate({
      trackId: "workflow-freeze",
      title: "Past tense review",
      templateId: "homework-template-one",
    });
    draft.topic = "Grammar";
    draft.description = "A short independent review.";
    draft.coverImageUrl = "/media/track-cover.webp";
    draft.support = {
      learnerMessage: "Try each activity before asking for help.",
      vocabularySupport: "yesterday — the day before today",
      readDirectionsAloud: true,
    };
    draft.design = {
      theme: "navy",
      contentWidth: "wide",
      progressStyle: "numbers",
    };

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    const frozen = parseGradedTrackFreezeDocument(payload.document);
    expect(frozen).toMatchObject({
      topic: "Grammar",
      description: "A short independent review.",
      coverImageUrl: "/media/track-cover.webp",
      support: draft.support,
      design: draft.design,
    });
  });

  it("uses activity-specific item language and counts", () => {
    const pairPart = seedGradedPartFromKind({
      kind: "line_match",
      order: 1,
      level: "primary",
    });
    expect(pairPart).not.toBeNull();
    if (!pairPart) return;
    expect(activityItemNoun(pairPart)).toBe("pair");
    expect(activityItemCount(pairPart)).toBeGreaterThan(0);
  });

  it("finds real media and blocks a listening activity with no audio source", () => {
    const draft = seedBlankGradedCollection({
      trackId: "media-track",
      title: "Listening",
      level: "primary",
    });
    const part = seedGradedPartFromKind({
      kind: "listen_and_choose",
      order: 1,
      level: "primary",
    });
    if (!part || part.source.type !== "homework_part" || part.source.part.kind !== "listen_and_choose") {
      throw new Error("Expected listen and choose part");
    }
    part.source.part.items[0]!.audioUrl = "";
    part.source.part.items[0]!.speakText = "";
    draft.parts = [part];
    draft.coverImageUrl = "/media/listening-cover.png";

    expect(trackMediaIssues(draft)).toHaveLength(1);
    expect(collectTrackMediaUsages(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "image", url: "/media/listening-cover.png" }),
      ]),
    );

    part.source.part.items[0]!.speakText = "Which sentence do you hear?";
    expect(trackMediaIssues(draft)).toHaveLength(0);
  });

  it("summarizes the actual assignment scoring manifest", () => {
    const draft = seedGradedFromTemplate({
      trackId: "points-track",
      title: "Scoring",
      templateId: "secondary-homework-template-one",
    });
    const scoring = trackScoringParts(draft);
    expect(scoring).toHaveLength(draft.parts.length);
    expect(scoring.every((part) => part.itemCount > 0)).toBe(true);
    expect(scoring.reduce((total, part) => total + part.maxScore, 0)).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  activityItemCount,
  activityItemNoun,
  focusedHomeworkCollectionPreview,
  seedBlankGradedCollection,
  seedGradedPartFromKind,
} from "@/lib/activity-tracks";
import {
  freezeGradedTrackHomeworkPayload,
  parseGradedTrackFreezeDocument,
} from "@/lib/class-homework/freeze-graded-track";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import {
  collectionPartFromReadingDocument,
  documentModuleValidationIssues,
} from "@/lib/homework-collections/document-module";
import {
  homeworkCollectionAttemptTotals,
  homeworkCollectionRequiredPartsComplete,
  scoreHomeworkCollectionAttempt,
} from "@/lib/homework-collections/scoring";
import {
  homeworkCollectionDisplayAnswer,
  homeworkCollectionItemLabel,
} from "@/lib/homework-collections/review-display";
import { createSampleDefinitionMatchDocument } from "@/lib/definition-match";
import { createSamplePictureStoryDocument } from "@/lib/picture-story";
import { createSampleReadAndAnswerDocument } from "@/lib/read-and-answer";
import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";

function seedSampleModule(
  kind: "picture_story" | "read_and_answer" | "definition_match",
  order: number,
) {
  const trackPart = seedGradedPartFromKind({
    kind,
    order,
    level: "primary",
  });
  if (trackPart?.source.type !== "homework_part") {
    throw new Error(`Expected ${kind} homework part`);
  }
  const part = trackPart.source.part;
  if (part.kind !== "document_module") {
    throw new Error("Expected document module");
  }
  const sample =
    kind === "picture_story"
      ? createSamplePictureStoryDocument()
      : kind === "read_and_answer"
        ? createSampleReadAndAnswerDocument()
        : createSampleDefinitionMatchDocument();
  part.title = sample.title;
  part.instructions = sample.instructions;
  part.document = sample as unknown as Record<string, unknown>;
  return { trackPart, part, sample };
}

describe("picture story and read and answer assign / review", () => {
  it("freezes both reading modules in one graded track with automatic scoring", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-reading-pair",
      title: "Look, read, answer",
      level: "primary",
    });
    const pictureStory = seedSampleModule("picture_story", 1);
    const readAndAnswer = seedSampleModule("read_and_answer", 2);
    draft.parts = [pictureStory.trackPart, readAndAnswer.trackPart];

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(normalizeHomeworkPayload(payload)?.type).toBe("graded_track");

    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.collectionDocument?.parts).toHaveLength(2);
    expect(freeze?.gradingManifest?.parts).toEqual([
      expect.objectContaining({
        partId: pictureStory.trackPart.id,
        format: "picture_story",
        gradingPolicy: "automatic",
        maxScore: 3,
      }),
      expect.objectContaining({
        partId: readAndAnswer.trackPart.id,
        format: "read_and_answer",
        gradingPolicy: "automatic",
        maxScore: 3,
      }),
    ]);

    const frozenPicture = freeze?.collectionDocument?.parts[0];
    expect(frozenPicture?.kind).toBe("document_module");
    if (frozenPicture?.kind !== "document_module") return;
    expect(frozenPicture.title).toBe("Mia's Little Seed");
    expect(frozenPicture.instructions).toBe(pictureStory.sample.instructions);
    expect(activityItemNoun(pictureStory.trackPart)).toBe("question");
    expect(activityItemCount(pictureStory.trackPart)).toBe(3);
    expect(activityItemCount(readAndAnswer.trackPart)).toBe(3);
  });

  it("blocks assignment of a blank read and answer and of a localStorage reading schema", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-blank-read",
      title: "Read",
      level: "primary",
    });
    const readAndAnswer = seedGradedPartFromKind({
      kind: "read_and_answer",
      order: 1,
      level: "primary",
    });
    draft.parts = [readAndAnswer!];
    expect(() => freezeGradedTrackHomeworkPayload({ document: draft })).toThrow(
      /Fix “Read and answer”/i,
    );

    const wrapped = collectionPartFromReadingDocument(
      "picture_story",
      {
        format: "picture_story_reading",
        title: "Old admin draft",
        frames: [],
      },
      "legacy-schema",
    );
    expect(documentModuleValidationIssues(wrapped).length).toBeGreaterThan(0);
  });

  it("blocks assignment of a blank definition match and scores filled pairs", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-blank-definition",
      title: "Match",
      level: "primary",
    });
    const blank = seedGradedPartFromKind({
      kind: "definition_match",
      order: 1,
      level: "primary",
    });
    draft.parts = [blank!];
    expect(() => freezeGradedTrackHomeworkPayload({ document: draft })).toThrow(
      /Fix “Definition match”/i,
    );

    const filled = seedSampleModule("definition_match", 1);
    draft.parts = [filled.trackPart];
    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(normalizeHomeworkPayload(payload)?.type).toBe("graded_track");

    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.gradingManifest?.parts[0]).toMatchObject({
      partId: filled.trackPart.id,
      format: "definition_match",
      gradingPolicy: "automatic",
      maxScore: 5,
    });
    expect(activityItemNoun(filled.trackPart)).toBe("pair");
    expect(activityItemCount(filled.trackPart)).toBe(5);

    const first = filled.sample.pairs[0]!;
    const second = filled.sample.pairs[1]!;
    expect(homeworkCollectionItemLabel(filled.part, first.id)).toBe(first.word);
    expect(homeworkCollectionDisplayAnswer(filled.part, first.id, second.id)).toBe(
      second.definition,
    );
  });

  it("scores student answers on the frozen collection and keeps review copy readable", () => {
    const pictureStory = seedSampleModule("picture_story", 1);
    const readAndAnswer = seedSampleModule("read_and_answer", 2);
    const document = {
      version: 1 as const,
      parts: [pictureStory.part, readAndAnswer.part],
    };

    const content = scoreHomeworkCollectionAttempt(document, {
      [pictureStory.part.id]: {
        answers: { q1: "seed", q2: "q2a", q3: "flower" },
        correct: 99,
      },
      [readAndAnswer.part.id]: {
        answers: { q1: "q1a", q2: "q2a", q3: "q3c" },
      },
    });

    expect(content.parts[pictureStory.part.id]?.correct).toBe(3);
    expect(content.parts[readAndAnswer.part.id]?.correct).toBe(2);
    expect(homeworkCollectionAttemptTotals(content)).toMatchObject({
      autoScore: 5,
      autoMaxScore: 6,
      manualMaxScore: 0,
    });
    expect(homeworkCollectionRequiredPartsComplete(document, content)).toBe(true);

    expect(homeworkCollectionItemLabel(pictureStory.part, "q2")).toBe(
      "What does Mia do at home?",
    );
    expect(homeworkCollectionDisplayAnswer(pictureStory.part, "q2", "q2a")).toBe(
      "She plants the seed.",
    );
    expect(homeworkCollectionDisplayAnswer(pictureStory.part, "q1", "seed")).toBe(
      "seed",
    );
    expect(homeworkCollectionItemLabel(readAndAnswer.part, "q1")).toBe(
      "Where does Mina go after breakfast?",
    );
    expect(homeworkCollectionDisplayAnswer(readAndAnswer.part, "q1", "q1a")).toBe(
      "To the park",
    );
  });

  it("previews a valid picture story when another homework part still blocks assign", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-mixed-preview",
      title: "Mixed",
      level: "primary",
    });
    const pictureStory = seedSampleModule("picture_story", 1);
    const multipleChoice = seedGradedPartFromKind({
      kind: "multiple_choice",
      order: 2,
      level: "primary",
    });
    if (multipleChoice?.source.type !== "homework_part") {
      throw new Error("Expected multiple-choice activity");
    }
    const mcPart = multipleChoice.source.part;
    if (mcPart.kind !== "multiple_choice") throw new Error("Expected multiple choice");
    mcPart.questions[0]!.options[0]!.text = "";
    draft.parts = [pictureStory.trackPart, multipleChoice];

    expect(() => freezeGradedTrackHomeworkPayload({ document: draft })).toThrow(
      /option 1 needs text/i,
    );

    const preview = focusedHomeworkCollectionPreview(draft, pictureStory.trackPart.id);
    expect(preview?.parts).toHaveLength(1);
    expect(preview?.parts[0]?.kind).toBe("document_module");
    if (preview?.parts[0]?.kind !== "document_module") return;
    expect(documentModuleValidationIssues(preview.parts[0])).toEqual([]);
    expect(
      (preview.parts[0] as HomeworkCollectionDocumentModulePart).title,
    ).toBe("Mia's Little Seed");
  });
});

import { describe, expect, it } from "vitest";
import {
  seedBlankGradedCollection,
  seedGradedPartFromKind,
} from "@/lib/activity-tracks";
import { parseActivityTrackDocument } from "@/lib/activity-tracks/parse-document";
import { createSampleDefinitionMatchDocument } from "@/lib/definition-match";
import { createSamplePictureStoryDocument } from "@/lib/picture-story";
import { createSampleReadAndAnswerDocument } from "@/lib/read-and-answer";
import {
  collectionPartFromReadingDocument,
  documentModuleItemIds,
  documentModuleValidationIssues,
  seedDocumentModuleFromTrackKind,
} from "@/lib/homework-collections/document-module";
import {
  homeworkCollectionPartValidationIssues,
  parseHomeworkCollectionPart,
} from "@/lib/homework-collections";

describe("reading document module seeding", () => {
  it("seeds picture story from a blank, not Mia's Little Seed", () => {
    const part = seedDocumentModuleFromTrackKind("picture_story");
    expect(part.moduleFormat).toBe("picture_story");
    expect(part.title).toBe("Picture story");
    expect(part.document).not.toMatchObject({ title: "Mia's Little Seed" });
    expect(documentModuleValidationIssues(part).length).toBeGreaterThan(0);
    expect(documentModuleItemIds(part)).toEqual([]);
  });

  it("seeds read and answer from a blank, not A Busy Saturday", () => {
    const part = seedDocumentModuleFromTrackKind("read_and_answer");
    expect(part.moduleFormat).toBe("read_and_answer");
    expect(part.title).toBe("Read and answer");
    expect(part.document).not.toMatchObject({ title: "A Busy Saturday" });
    expect(documentModuleValidationIssues(part).length).toBeGreaterThan(0);
    expect(documentModuleItemIds(part)).toEqual([]);
  });

  it("seeds definition match from a blank, not Hobbies sample", () => {
    const part = seedDocumentModuleFromTrackKind("definition_match");
    expect(part.moduleFormat).toBe("definition_match");
    expect(part.title).toBe("Definition match");
    expect(part.document).not.toMatchObject({ title: "Hobbies · Definition match" });
    expect(documentModuleValidationIssues(part).length).toBeGreaterThan(0);
    expect(documentModuleItemIds(part)).toEqual([]);
  });

  it("keeps incomplete reading drafts when parsing a collection part", () => {
    const pictureStory = seedDocumentModuleFromTrackKind("picture_story");
    const parsedPicture = parseHomeworkCollectionPart(pictureStory);
    expect(parsedPicture?.kind).toBe("document_module");
    if (parsedPicture?.kind !== "document_module") return;
    expect(parsedPicture.document).toMatchObject({ kind: "picture-story" });
    expect(homeworkCollectionPartValidationIssues(parsedPicture).length).toBeGreaterThan(0);

    const definitionMatch = seedDocumentModuleFromTrackKind("definition_match");
    const parsedMatch = parseHomeworkCollectionPart(definitionMatch);
    expect(parsedMatch?.kind).toBe("document_module");
    if (parsedMatch?.kind !== "document_module") return;
    expect(parsedMatch.document).toMatchObject({ kind: "definition-match" });
    expect(homeworkCollectionPartValidationIssues(parsedMatch).length).toBeGreaterThan(0);
  });

  it("round-trips a blank picture story through the graded track draft parser", () => {
    const draft = seedBlankGradedCollection({
      trackId: "blank-picture-story-track",
      title: "Look and answer",
      level: "primary",
    });
    const part = seedGradedPartFromKind({
      kind: "picture_story",
      order: 1,
      level: "primary",
    });
    expect(part).not.toBeNull();
    draft.parts = [part!];

    const parsed = parseActivityTrackDocument(structuredClone(draft));
    expect(parsed).not.toBeNull();
    expect(parsed?.parts[0]?.source.type).toBe("homework_part");
    if (parsed?.parts[0]?.source.type !== "homework_part") return;
    expect(parsed.parts[0].source.part.kind).toBe("document_module");
    if (parsed.parts[0].source.part.kind !== "document_module") return;
    expect(parsed.parts[0].source.part.moduleFormat).toBe("picture_story");
    expect(homeworkCollectionPartValidationIssues(parsed.parts[0].source.part).length).toBeGreaterThan(
      0,
    );
  });

  it("wraps Activity Bank documents so the shared Track Builder editors can save them", () => {
    const pictureStory = collectionPartFromReadingDocument(
      "picture_story",
      createSamplePictureStoryDocument() as unknown as Record<string, unknown>,
      "activity-bank-picture-story",
    );
    const readAndAnswer = collectionPartFromReadingDocument(
      "read_and_answer",
      createSampleReadAndAnswerDocument() as unknown as Record<string, unknown>,
      "activity-bank-read-and-answer",
    );
    expect(pictureStory.id).toBe("activity-bank-picture-story");
    expect(pictureStory.moduleFormat).toBe("picture_story");
    expect(pictureStory.title).toBe("Mia's Little Seed");
    expect(documentModuleValidationIssues(pictureStory)).toEqual([]);
    expect(documentModuleItemIds(pictureStory).length).toBeGreaterThan(0);
    expect(readAndAnswer.moduleFormat).toBe("read_and_answer");
    expect(readAndAnswer.title).toBe("A Busy Saturday");
    expect(documentModuleValidationIssues(readAndAnswer)).toEqual([]);

    const definitionMatch = collectionPartFromReadingDocument(
      "definition_match",
      createSampleDefinitionMatchDocument() as unknown as Record<string, unknown>,
      "activity-bank-definition-match",
    );
    expect(definitionMatch.moduleFormat).toBe("definition_match");
    expect(definitionMatch.title).toBe("Hobbies · Definition match");
    expect(documentModuleValidationIssues(definitionMatch)).toEqual([]);
    expect(documentModuleItemIds(definitionMatch)).toHaveLength(5);
  });
});

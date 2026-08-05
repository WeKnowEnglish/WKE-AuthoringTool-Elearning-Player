import { describe, expect, it } from "vitest";
import {
  homeworkPayloadSummary,
  normalizeHomeworkPayload,
} from "@/lib/class-homework/normalize";
import { createSamplePictureClozeDocument } from "@/lib/picture-cloze/sample";
import { createSampleVerbTableDocument } from "@/lib/verb-table/sample";
import { createSampleSentenceColumnsDocument } from "@/lib/sentence-columns/sample";
import { createSampleWordAnnotationDocument } from "@/lib/word-annotation/sample";
import { createSamplePictureWritingDocument } from "@/lib/picture-writing/sample";
import { createSampleQuestionWritingDocument } from "@/lib/question-writing/sample";
import { createSampleDefinitionMatchDocument } from "@/lib/definition-match/sample";
import { createSampleClozeChoiceDocument } from "@/lib/cloze-choice/sample";
import { createSampleClozeOpenDocument } from "@/lib/cloze-open/sample";
import { createSampleReadAndAnswerDocument } from "@/lib/read-and-answer/sample";
import { createSamplePictureStoryDocument } from "@/lib/picture-story/sample";

describe("class-homework/normalize", () => {
  it("normalizes pack quiz and rejects empty quiz id", () => {
    expect(normalizeHomeworkPayload({ type: "pack_quiz", quizId: "" })).toBeNull();
    const payload = normalizeHomeworkPayload({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 4,
    });
    expect(payload).toEqual({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 4,
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Animals");
  });

  it("preserves frozen questions on pack quiz payloads", () => {
    const payload = normalizeHomeworkPayload({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 99,
      frozenAt: "2026-01-01T00:00:00.000Z",
      questions: [
        {
          id: "a:find",
          wordId: "a",
          mode: "find_lemma",
          payload: {
            type: "interaction",
            subtype: "mc_quiz",
            question: "Find: cat",
            options: [
              { id: "a", label: "cat" },
              { id: "b", label: "dog" },
              { id: "c", label: "bird" },
              { id: "d", label: "fish" },
            ],
            correct_option_id: "a",
            shuffle_options: false,
            image_fit: "contain",
          },
        },
      ],
    });
    expect(payload?.type).toBe("pack_quiz");
    if (payload?.type !== "pack_quiz") return;
    expect(payload.questionCount).toBe(1);
    expect(payload.questions).toHaveLength(1);
    expect(payload.frozenAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("normalizes pack flashcards and rejects empty set id", () => {
    expect(normalizeHomeworkPayload({ type: "pack_flashcards", setId: "" })).toBeNull();
    const payload = normalizeHomeworkPayload({
      type: "pack_flashcards",
      setId: "s1",
      setTitle: "Pets cards",
      cardCount: 3,
    });
    expect(payload).toEqual({
      type: "pack_flashcards",
      setId: "s1",
      setTitle: "Pets cards",
      cardCount: 3,
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Pets cards");
  });

  it("normalizes word pack practice and external notes", () => {
    const pack = normalizeHomeworkPayload({
      type: "word_pack_practice",
      packId: "p1",
      packTitle: "Food",
      wordCount: 8,
    });
    expect(pack?.type).toBe("word_pack_practice");

    expect(normalizeHomeworkPayload({ type: "external_note", body: "  " })).toBeNull();
    const note = normalizeHomeworkPayload({
      type: "external_note",
      body: "Finish page 12",
    });
    expect(note).toEqual({ type: "external_note", body: "Finish page 12" });
  });

  it("normalizes writing_prompt homework", () => {
    expect(normalizeHomeworkPayload({ type: "writing_prompt", prompt: "  " })).toBeNull();
    const payload = normalizeHomeworkPayload({
      type: "writing_prompt",
      prompt: "Describe your weekend.",
      minWords: 40,
    });
    expect(payload).toEqual({
      type: "writing_prompt",
      prompt: "Describe your weekend.",
      minWords: 40,
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Describe your weekend");
  });

  it("normalizes studio_activity and rejects incomplete packs", () => {
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "",
        format: "multiple_choice",
        title: "Bakery",
        screenCount: 2,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "a1",
        format: "vocabulary_list",
        title: "List",
        screenCount: 2,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "a1",
        format: "multiple_choice",
        title: "Bakery",
        screenCount: 0,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();

    const payload = normalizeHomeworkPayload({
      type: "studio_activity",
      activityId: "a1",
      format: "multiple_choice",
      title: "Bakery quiz",
      screenCount: 3,
      pack: { title: "Bakery", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(payload).toEqual({
      type: "studio_activity",
      activityId: "a1",
      format: "multiple_choice",
      title: "Bakery quiz",
      screenCount: 3,
      pack: { title: "Bakery", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Bakery quiz");
    expect(homeworkPayloadSummary(payload!)).toContain("3 screens");

    const trackPayload = normalizeHomeworkPayload({
      type: "studio_activity",
      activityId: "track-1",
      format: "learning_track",
      title: "Hobbies Day 1",
      screenCount: 12,
      pack: { kind: "lessonplayer-track-pack", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(trackPayload).toEqual({
      type: "studio_activity",
      activityId: "track-1",
      format: "learning_track",
      title: "Hobbies Day 1",
      screenCount: 12,
      pack: { kind: "lessonplayer-track-pack", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(homeworkPayloadSummary(trackPayload!)).toContain("Learning track");
  });

  it("normalizes the curated secondary homework template", () => {
    const payload = normalizeHomeworkPayload({
      type: "homework_template",
      templateId: "homework-template-one",
      title: "Homework Template One",
      sectionCount: 99,
      frozenAt: "2026-07-31T00:00:00.000Z",
    });
    expect(payload).toEqual({
      type: "homework_template",
      templateId: "homework-template-one",
      title: "Homework Template One",
      sectionCount: 6,
      frozenAt: "2026-07-31T00:00:00.000Z",
    });
    expect(homeworkPayloadSummary(payload!)).toContain("6 parts");
    expect(
      normalizeHomeworkPayload({
        type: "homework_template",
        templateId: "unknown-template",
      }),
    ).toBeNull();

    const secondary = normalizeHomeworkPayload({
      type: "homework_template",
      templateId: "secondary-homework-template-one",
      title: "",
      sectionCount: 99,
      frozenAt: "2026-08-03T00:00:00.000Z",
    });
    expect(secondary).toEqual({
      type: "homework_template",
      templateId: "secondary-homework-template-one",
      title: "Secondary Homework One",
      sectionCount: 5,
      frozenAt: "2026-08-03T00:00:00.000Z",
    });
  });

  it("normalizes frozen picture cloze homework", () => {
    const document = createSamplePictureClozeDocument();
    const payload = normalizeHomeworkPayload({
      type: "picture_cloze",
      activityId: "pc-1",
      title: "Tools cloze",
      itemCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("picture_cloze");
    if (payload?.type === "picture_cloze") {
      expect(payload.itemCount).toBe(4);
      expect(payload.title).toBe("Tools cloze");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("4 pictures");
  });

  it("normalizes frozen verb table homework", () => {
    const document = createSampleVerbTableDocument();
    const payload = normalizeHomeworkPayload({
      type: "verb_table",
      activityId: "vt-1",
      title: "Irregulars",
      rowCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("verb_table");
    if (payload?.type === "verb_table") {
      expect(payload.rowCount).toBe(6);
      expect(payload.title).toBe("Irregulars");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("6 rows");
  });

  it("normalizes frozen sentence columns homework", () => {
    const document = createSampleSentenceColumnsDocument();
    const payload = normalizeHomeworkPayload({
      type: "sentence_columns",
      activityId: "sc-1",
      title: "Builders",
      challengeCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("sentence_columns");
    if (payload?.type === "sentence_columns") {
      expect(payload.challengeCount).toBe(4);
      expect(payload.title).toBe("Builders");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("4 sentences");
  });

  it("normalizes frozen word annotation homework", () => {
    const document = createSampleWordAnnotationDocument();
    const payload = normalizeHomeworkPayload({
      type: "word_annotation",
      activityId: "wa-1",
      title: "Detectives",
      targetCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("word_annotation");
    if (payload?.type === "word_annotation") {
      expect(payload.targetCount).toBe(7);
      expect(payload.title).toBe("Detectives");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("7 targets");
  });

  it("normalizes frozen picture writing homework", () => {
    const document = createSamplePictureWritingDocument();
    const payload = normalizeHomeworkPayload({
      type: "picture_writing",
      activityId: "pw-1",
      title: "Writers",
      promptCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("picture_writing");
    if (payload?.type === "picture_writing") {
      expect(payload.promptCount).toBe(4);
      expect(payload.title).toBe("Writers");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("4 prompts");
  });

  it("normalizes frozen question writing homework", () => {
    const document = createSampleQuestionWritingDocument();
    const payload = normalizeHomeworkPayload({
      type: "question_writing",
      activityId: "qw-1",
      title: "Questions",
      promptCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("question_writing");
    if (payload?.type === "question_writing") {
      expect(payload.promptCount).toBe(5);
      expect(payload.title).toBe("Questions");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("5 prompts");
  });

  it("normalizes frozen definition match homework", () => {
    const document = createSampleDefinitionMatchDocument();
    const payload = normalizeHomeworkPayload({
      type: "definition_match",
      activityId: "dm-1",
      title: "Meanings",
      pairCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("definition_match");
    if (payload?.type === "definition_match") {
      expect(payload.pairCount).toBe(5);
      expect(payload.title).toBe("Meanings");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("5 pairs");
  });

  it("normalizes frozen cloze choice homework", () => {
    const document = createSampleClozeChoiceDocument();
    const payload = normalizeHomeworkPayload({
      type: "cloze_choice",
      activityId: "cc-1",
      title: "Morning",
      gapCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("cloze_choice");
    if (payload?.type === "cloze_choice") {
      expect(payload.gapCount).toBe(5);
      expect(payload.title).toBe("Morning");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("5 gaps");
  });

  it("normalizes frozen open cloze homework", () => {
    const document = createSampleClozeOpenDocument();
    const payload = normalizeHomeworkPayload({
      type: "cloze_open",
      activityId: "co-1",
      title: "Garden",
      gapCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("cloze_open");
    if (payload?.type === "cloze_open") {
      expect(payload.gapCount).toBe(4);
      expect(payload.title).toBe("Garden");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("4 gaps");
  });

  it("normalizes frozen read and answer homework", () => {
    const document = createSampleReadAndAnswerDocument();
    const payload = normalizeHomeworkPayload({
      type: "read_and_answer",
      activityId: "ra-1",
      title: "Saturday",
      questionCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("read_and_answer");
    if (payload?.type === "read_and_answer") {
      expect(payload.questionCount).toBe(3);
      expect(payload.title).toBe("Saturday");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("3 questions");
  });

  it("normalizes frozen picture story homework", () => {
    const document = createSamplePictureStoryDocument();
    const payload = normalizeHomeworkPayload({
      type: "picture_story",
      activityId: "ps-1",
      title: "Seed",
      questionCount: 99,
      frameCount: 99,
      document,
      frozenAt: "2026-08-01T00:00:00.000Z",
    });
    expect(payload?.type).toBe("picture_story");
    if (payload?.type === "picture_story") {
      expect(payload.questionCount).toBe(3);
      expect(payload.frameCount).toBe(3);
      expect(payload.title).toBe("Seed");
    }
    expect(homeworkPayloadSummary(payload!)).toContain("3 questions");
    expect(homeworkPayloadSummary(payload!)).toContain("3 frames");
  });
});

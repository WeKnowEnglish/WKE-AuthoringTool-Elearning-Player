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
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";

describe("freezeGradedTrackHomeworkPayload", () => {
  it("freezes a Primary template clone with full section content", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-test-1",
      title: "My graded pack",
      templateId: "homework-template-one",
    });
    draft.parts[0]!.label = "Custom cloze label";
    if (draft.parts[0]!.source.type === "template_section") {
      draft.parts[0]!.source.section.instructions = "Edited instructions for freeze.";
    }

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(payload.type).toBe("graded_track");
    expect(payload.originTemplateId).toBe("homework-template-one");
    expect(payload.level).toBe("primary");
    expect(payload.sectionCount).toBe(6);

    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.primaryDocument?.sections[0]?.title).toBe("Custom cloze label");
    expect(freeze?.primaryDocument?.sections[0]?.instructions).toBe(
      "Edited instructions for freeze.",
    );

    const normalized = normalizeHomeworkPayload(payload);
    expect(normalized?.type).toBe("graded_track");
    if (normalized?.type === "graded_track") {
      expect(normalized.sectionCount).toBe(6);
      expect(normalized.title).toBe("My graded pack");
    }
  });

  it("freezes a Secondary template clone", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-test-2",
      title: "Secondary graded",
      templateId: "secondary-homework-template-one",
    });
    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(payload.level).toBe("secondary");
    expect(payload.sectionCount).toBe(5);
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.secondaryDocument?.reading.title).toBeTruthy();
  });

  it("blocks assignment when a Secondary correct answer is blank", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-invalid-secondary-answer",
      title: "Secondary answer check",
      templateId: "secondary-homework-template-one",
    });
    const corrections = draft.parts.find(
      (part) => part.kind === "secondary_corrections",
    );
    if (corrections?.source.type !== "template_section") {
      throw new Error("Expected corrections section");
    }
    const questions = corrections.source.section.questions as Array<
      Record<string, unknown>
    >;
    questions[0]!.answer = "";

    expect(() =>
      freezeGradedTrackHomeworkPayload({ document: draft }),
    ).toThrow(/Fix .* before assigning: questions\.0\.answer/i);
  });

  it("preserves edited word annotation roles in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-annot-edit",
      title: "Annotation edits",
      templateId: "homework-template-one",
    });
    const annotPart = draft.parts.find((part) => part.kind === "word_annotation");
    expect(annotPart?.source.type).toBe("template_section");
    if (!annotPart || annotPart.source.type !== "template_section") {
      throw new Error("Expected word annotation part");
    }

    const section = structuredClone(annotPart.source.section) as {
      rememberText: string;
      sentences: Array<{
        id: string;
        tokens: Array<{ id: string; text: string; role: string | null }>;
      }>;
    };
    section.rememberText = "Edited remember tip.";
    section.sentences[0] = {
      ...section.sentences[0]!,
      tokens: section.sentences[0]!.tokens.map((token) =>
        token.text === "favourite" ? { ...token, role: "adverb" } : token,
      ),
    };
    annotPart.source.section = section as unknown as Record<string, unknown>;

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const frozen = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "word_annotation",
    );
    expect(frozen && "rememberText" in frozen ? frozen.rememberText : null).toBe(
      "Edited remember tip.",
    );
    const favourite =
      frozen && "sentences" in frozen
        ? frozen.sentences[0]?.tokens.find((token) => token.text === "favourite")
        : null;
    expect(favourite?.role).toBe("adverb");
  });

  it("preserves edited picture cloze bank and answers in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-cloze-edit",
      title: "Cloze edits",
      templateId: "homework-template-one",
    });
    const clozePart = draft.parts.find((part) => part.kind === "picture_cloze");
    expect(clozePart?.source.type).toBe("template_section");
    if (!clozePart || clozePart.source.type !== "template_section") {
      throw new Error("Expected picture cloze part");
    }

    const section = structuredClone(clozePart.source.section) as {
      wordBank: string[];
      items: Array<{
        id: string;
        acceptedAnswers: string[];
        prompt: string;
      }>;
    };
    section.wordBank = ["apple", "banana", "carrot", "date", "egg", "fig"];
    section.items[0] = {
      ...section.items[0]!,
      prompt: "What fruit is this?",
      acceptedAnswers: ["apple"],
    };
    clozePart.source.section = section as unknown as Record<string, unknown>;

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const frozen = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "picture_cloze",
    );
    expect(frozen && "wordBank" in frozen ? frozen.wordBank : null).toEqual(
      section.wordBank,
    );
    expect(frozen && "items" in frozen ? frozen.items[0]?.prompt : null).toBe(
      "What fruit is this?",
    );
    expect(
      frozen && "items" in frozen ? frozen.items[0]?.acceptedAnswers : null,
    ).toEqual(["apple"]);
  });

  it("preserves edited verb table forms and missing cells in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-verb-edit",
      title: "Verb edits",
      templateId: "homework-template-one",
    });
    const verbPart = draft.parts.find((part) => part.kind === "verb_table");
    expect(verbPart?.source.type).toBe("template_section");
    if (!verbPart || verbPart.source.type !== "template_section") {
      throw new Error("Expected verb table part");
    }

    const section = structuredClone(verbPart.source.section) as {
      rows: Array<{
        id: string;
        forms: { base: string; past: string; participle: string };
        missing: string[];
      }>;
    };
    section.rows[0] = {
      ...section.rows[0]!,
      forms: { base: "run", past: "ran", participle: "run" },
      missing: ["base", "participle"],
    };
    verbPart.source.section = section as unknown as Record<string, unknown>;

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const frozenRow = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "verb_table",
    );
    expect(frozenRow && "rows" in frozenRow ? frozenRow.rows[0] : null).toEqual({
      id: section.rows[0]!.id,
      forms: { base: "run", past: "ran", participle: "run" },
      missing: ["base", "participle"],
    });
  });

  it("preserves edited sentence column challenge pieces in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-sc-edit",
      title: "Sentence columns edits",
      templateId: "homework-template-one",
    });
    const part = draft.parts.find((row) => row.kind === "sentence_columns");
    if (!part || part.source.type !== "template_section") {
      throw new Error("Expected sentence columns part");
    }
    const section = structuredClone(part.source.section) as {
      challenges: Array<{
        id: string;
        pieces: Array<{ id: string; text: string; columnId: string }>;
      }>;
    };
    section.challenges[0] = {
      ...section.challenges[0]!,
      pieces: section.challenges[0]!.pieces.map((piece) =>
        piece.columnId === "subject"
          ? { ...piece, text: "The brave cat" }
          : piece,
      ),
    };
    part.source.section = section as unknown as Record<string, unknown>;

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    const frozen = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "sentence_columns",
    );
    const subject =
      frozen && "challenges" in frozen
        ? frozen.challenges[0]?.pieces.find((piece) => piece.columnId === "subject")
        : null;
    expect(subject?.text).toBe("The brave cat");
  });

  it("preserves edited picture writing prompts in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-pw-edit",
      title: "Picture writing edits",
      templateId: "homework-template-one",
    });
    const part = draft.parts.find((row) => row.kind === "picture_writing");
    if (!part || part.source.type !== "template_section") {
      throw new Error("Expected picture writing part");
    }
    const section = structuredClone(part.source.section) as {
      prompts: Array<{ id: string; question: string; requiredWords: string[] }>;
    };
    section.prompts[0] = {
      ...section.prompts[0]!,
      question: "What did they notice?",
      requiredWords: ["visitors", "mountain"],
    };
    part.source.section = section as unknown as Record<string, unknown>;

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    const frozen = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "picture_writing",
    );
    expect(frozen && "prompts" in frozen ? frozen.prompts[0]?.question : null).toBe(
      "What did they notice?",
    );
  });

  it("preserves edited question writing model questions in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-qw-edit",
      title: "Question writing edits",
      templateId: "homework-template-one",
    });
    const part = draft.parts.find((row) => row.kind === "question_writing");
    if (!part || part.source.type !== "template_section") {
      throw new Error("Expected question writing part");
    }
    const section = structuredClone(part.source.section) as {
      workedExample: { prompt: string; question: string; answer: string };
      prompts: Array<{ id: string; modelQuestion: string }>;
    };
    section.workedExample = {
      ...section.workedExample,
      question: "Have you ever climbed a tree?",
    };
    section.prompts[0] = {
      ...section.prompts[0]!,
      modelQuestion: "Have you ever flown a kite?",
    };
    part.source.section = section as unknown as Record<string, unknown>;

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    const frozen = freeze?.primaryDocument?.sections.find(
      (item) => item.kind === "question_writing",
    );
    expect(
      frozen && "workedExample" in frozen ? frozen.workedExample.question : null,
    ).toBe("Have you ever climbed a tree?");
    expect(
      frozen && "prompts" in frozen ? frozen.prompts[0]?.modelQuestion : null,
    ).toBe("Have you ever flown a kite?");
  });

  it("preserves edited Secondary sequence reading and correctOrder in the freeze", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-sec-seq",
      title: "Secondary sequence edits",
      templateId: "secondary-homework-template-one",
    });
    const part = draft.parts.find((row) => row.kind === "secondary_sequence");
    if (!part || part.source.type !== "template_section") {
      throw new Error("Expected secondary sequence part");
    }
    const section = structuredClone(part.source.section) as {
      title: string;
      correctOrder: string[];
      events: Array<{ id: string; text: string }>;
    };
    section.title = "Edited beach story";
    section.correctOrder = ["E", "B", "A", "D", "C"];
    section.events = section.events.map((event) =>
      event.id === "C" ? { ...event, text: "Volunteers arrived early." } : event,
    );
    part.source.section = section as unknown as Record<string, unknown>;

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    expect(freeze?.secondaryDocument?.reading.title).toBe("Edited beach story");
    expect(freeze?.secondaryDocument?.reading.correctOrder).toEqual([
      "E",
      "B",
      "A",
      "D",
      "C",
    ]);
    expect(
      freeze?.secondaryDocument?.reading.events.find((event) => event.id === "C")
        ?.text,
    ).toBe("Volunteers arrived early.");
  });

  it("preserves edited Secondary corrections, dialogue, questions, and speaking", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-sec-parts",
      title: "Secondary part edits",
      templateId: "secondary-homework-template-one",
    });

    const corrections = draft.parts.find(
      (row) => row.kind === "secondary_corrections",
    );
    const dialogue = draft.parts.find((row) => row.kind === "secondary_dialogue");
    const questions = draft.parts.find((row) => row.kind === "secondary_questions");
    const speaking = draft.parts.find((row) => row.kind === "speaking_prompt");
    if (
      !corrections ||
      corrections.source.type !== "template_section" ||
      !dialogue ||
      dialogue.source.type !== "template_section" ||
      !questions ||
      questions.source.type !== "template_section" ||
      !speaking ||
      speaking.source.type !== "template_section"
    ) {
      throw new Error("Expected all Secondary graded parts");
    }

    const correctionsSection = structuredClone(corrections.source.section) as {
      questions: Array<{ id: string; sentence: string; answer: string }>;
    };
    correctionsSection.questions[0] = {
      ...correctionsSection.questions[0]!,
      sentence: "They goed home late.",
      answer: "went",
    };
    corrections.source.section =
      correctionsSection as unknown as Record<string, unknown>;

    const dialogueSection = structuredClone(dialogue.source.section) as {
      lines: Array<{ id: string; answer: string; accepted?: string[] }>;
    };
    dialogueSection.lines[0] = {
      ...dialogueSection.lines[0]!,
      answer: "noticed",
      accepted: ["noticed", "saw"],
    };
    dialogue.source.section = dialogueSection as unknown as Record<string, unknown>;

    const questionsSection = structuredClone(questions.source.section) as {
      items: Array<{ id: string; answer: string; choices: string[] }>;
    };
    questionsSection.items[0] = {
      ...questionsSection.items[0]!,
      choices: ["did", "were"],
      answer: "were",
    };
    questions.source.section =
      questionsSection as unknown as Record<string, unknown>;

    const speakingSection = structuredClone(speaking.source.section) as {
      planningPrompts: string[];
      maxDurationSeconds: number;
      teacherScoreTotal: number;
    };
    speakingSection.planningPrompts = ["Name your community.", "Say why you like it."];
    speakingSection.maxDurationSeconds = 90;
    speakingSection.teacherScoreTotal = 8;
    speaking.source.section = speakingSection as unknown as Record<string, unknown>;

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    expect(freeze?.secondaryDocument?.corrections.questions[0]?.sentence).toBe(
      "They goed home late.",
    );
    expect(freeze?.secondaryDocument?.dialogue.lines[0]?.answer).toBe("noticed");
    expect(freeze?.secondaryDocument?.questions.items[0]?.answer).toBe("were");
    expect(freeze?.secondaryDocument?.speaking.planningPrompts).toEqual([
      "Name your community.",
      "Say why you like it.",
    ]);
    expect(freeze?.secondaryDocument?.speaking.maxDurationSeconds).toBe(90);
    expect(freeze?.secondaryDocument?.speaking.teacherScoreTotal).toBe(8);
  });

  it("freezes Primary after removing one section with renumbered orders", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-remove-primary",
      title: "Five parts",
      templateId: "homework-template-one",
    });
    draft.parts = renumberParts(
      draft.parts.filter((part) => part.kind !== "verb_table"),
    );
    expect(draft.parts).toHaveLength(5);

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(payload.sectionCount).toBe(5);
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.primaryDocument?.sections).toHaveLength(5);
    expect(freeze?.primaryDocument?.sections.map((section) => section.order)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(
      freeze?.primaryDocument?.sections.some((section) => section.kind === "verb_table"),
    ).toBe(false);
  });

  it("freezes Primary after adding a second picture cloze section", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-add-cloze",
      title: "Seven parts",
      templateId: "homework-template-one",
    });
    const extra = seedGradedPartFromKind({
      kind: "picture_cloze",
      order: draft.parts.length + 1,
      level: "primary",
    });
    expect(extra).toBeTruthy();
    draft.parts = renumberParts([...draft.parts, extra!]);
    expect(draft.parts).toHaveLength(7);

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    expect(freeze?.primaryDocument?.sections).toHaveLength(7);
    expect(
      freeze?.primaryDocument?.sections.filter(
        (section) => section.kind === "picture_cloze",
      ),
    ).toHaveLength(2);
    expect(freeze?.parts).toHaveLength(7);
  });

  it("freezes Secondary with speaking removed as four parts", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-remove-speaking",
      title: "No speaking",
      templateId: "secondary-homework-template-one",
    });
    draft.parts = renumberParts(
      draft.parts.filter((part) => part.kind !== "speaking_prompt"),
    );
    expect(draft.parts).toHaveLength(4);

    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    expect(payload.sectionCount).toBe(4);
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.parts).toHaveLength(4);
    expect(freeze?.parts.some((part) => part.sectionId === "community-speaking")).toBe(
      false,
    );
  });

  it("freezes repeated Secondary activity kinds as independent instances", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-repeat-secondary-questions",
      title: "Repeated question practice",
      templateId: "secondary-homework-template-one",
    });
    const extraQuestions = seedGradedPartFromKind({
      kind: "secondary_questions",
      order: draft.parts.length + 1,
      level: "secondary",
      existingParts: draft.parts,
    });
    expect(extraQuestions).toBeTruthy();
    expect(extraQuestions?.id).not.toBe("past-question-choice");
    draft.parts = renumberParts([...draft.parts, extraQuestions!]);

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    const questionParts = freeze?.secondaryParts?.filter(
      (part) => part.templatePartId === "past-question-choice",
    );
    expect(freeze?.parts).toHaveLength(6);
    expect(questionParts).toHaveLength(2);
    expect(new Set(questionParts?.map((part) => part.id)).size).toBe(2);
  });

  it("freezes repeatable collection activities alongside a legacy preset", () => {
    const draft = seedGradedFromTemplate({
      trackId: "track-mixed-collection",
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
    expect(letters?.source.type).toBe("homework_part");
    expect(response?.source.type).toBe("homework_part");
    draft.parts = renumberParts([...draft.parts, letters!, response!]);

    const freeze = parseGradedTrackFreezeDocument(
      freezeGradedTrackHomeworkPayload({ document: draft }).document,
    );
    expect(freeze?.primaryDocument?.sections).toHaveLength(6);
    expect(freeze?.collectionDocument?.parts.map((part) => part.kind)).toEqual([
      "letter_mixup",
      "free_response",
    ]);
    expect(freeze?.parts).toHaveLength(8);
  });

  it("freezes a blank collection without manufacturing template sections", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-blank-collection",
      title: "Friday homework",
      level: "secondary",
    });
    const listen = seedGradedPartFromKind({
      kind: "listen_and_choose",
      order: 1,
      level: "secondary",
    });
    draft.parts = [listen!];
    const payload = freezeGradedTrackHomeworkPayload({ document: draft });
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    expect(freeze?.secondaryDocument).toBeUndefined();
    expect(freeze?.collectionDocument?.parts[0]?.kind).toBe("listen_and_choose");
    expect(normalizeHomeworkPayload(payload)?.type).toBe("graded_track");
  });

  it("blocks assignment instead of dropping an incomplete collection question", () => {
    const draft = seedBlankGradedCollection({
      trackId: "track-invalid-collection",
      title: "Incomplete collection",
      level: "secondary",
    });
    const multipleChoice = seedGradedPartFromKind({
      kind: "multiple_choice",
      order: 1,
      level: "secondary",
    });
    if (multipleChoice?.source.type !== "homework_part") {
      throw new Error("Expected multiple-choice activity");
    }
    const part = multipleChoice.source.part;
    if (part.kind !== "multiple_choice") throw new Error("Expected multiple choice");
    part.questions[0]!.options[0]!.text = "";
    draft.parts = [multipleChoice];

    expect(() =>
      freezeGradedTrackHomeworkPayload({ document: draft }),
    ).toThrow(/option 1 needs text/i);
  });
});

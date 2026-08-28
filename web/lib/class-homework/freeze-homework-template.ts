import {
  HOMEWORK_TEMPLATE_ONE,
  homeworkTemplateOneSchema,
  type HomeworkTemplateOne,
} from "@/lib/homework-templates/homework-template-one";
import {
  parseSecondaryCorrectionsSection,
  parseSecondaryDialogueSection,
  parseSecondaryQuestionsSection,
  parseSecondarySequenceSection,
  parseSecondarySpeakingSection,
  SECONDARY_HOMEWORK_ONE,
  SECONDARY_HOMEWORK_ONE_ID,
} from "@/lib/homework-templates/secondary-homework-one";
import type { HomeworkTemplateId } from "@/lib/homework-templates/registry";

type SecondaryHomeworkOneDocument = typeof SECONDARY_HOMEWORK_ONE;
type FrozenHomeworkTemplateDocument =
  | HomeworkTemplateOne
  | SecondaryHomeworkOneDocument;

function parseSecondaryHomeworkOneDocument(
  raw: unknown,
): SecondaryHomeworkOneDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const reading = parseSecondarySequenceSection(input.reading);
  const corrections = parseSecondaryCorrectionsSection(input.corrections);
  const dialogue = parseSecondaryDialogueSection(input.dialogue);
  const questions = parseSecondaryQuestionsSection(input.questions);
  const speaking = parseSecondarySpeakingSection(input.speaking);
  if (!reading || !corrections || !dialogue || !questions || !speaking) {
    return null;
  }

  // The validators establish the runtime shape. The cast retains the existing
  // read-only content contract used by SecondaryHomeworkOneShell.
  return {
    reading,
    corrections,
    dialogue,
    questions,
    speaking,
  } as unknown as SecondaryHomeworkOneDocument;
}

export function parseFrozenHomeworkTemplateDocument(
  templateId: HomeworkTemplateId,
  raw: unknown,
): FrozenHomeworkTemplateDocument | null {
  if (templateId === HOMEWORK_TEMPLATE_ONE.id) {
    const parsed = homeworkTemplateOneSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }
  if (templateId === SECONDARY_HOMEWORK_ONE_ID) {
    return parseSecondaryHomeworkOneDocument(raw);
  }
  return null;
}

export function parseFrozenPrimaryHomeworkTemplateDocument(
  raw: unknown,
): HomeworkTemplateOne | null {
  const parsed = homeworkTemplateOneSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseFrozenSecondaryHomeworkTemplateDocument(
  raw: unknown,
): SecondaryHomeworkOneDocument | null {
  return parseSecondaryHomeworkOneDocument(raw);
}

/**
 * Clone a registered template into an assignment-owned document.
 * Later template edits cannot alter the assigned homework.
 */
export function freezeHomeworkTemplateDocument(
  templateId: HomeworkTemplateId,
): Record<string, unknown> {
  const source =
    templateId === HOMEWORK_TEMPLATE_ONE.id
      ? HOMEWORK_TEMPLATE_ONE
      : templateId === SECONDARY_HOMEWORK_ONE_ID
        ? SECONDARY_HOMEWORK_ONE
        : null;
  if (!source) throw new Error("Homework template not found.");

  const parsed = parseFrozenHomeworkTemplateDocument(
    templateId,
    structuredClone(source),
  );
  if (!parsed) throw new Error("Homework template content failed validation.");
  return structuredClone(parsed) as unknown as Record<string, unknown>;
}

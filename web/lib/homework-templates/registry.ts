export const HOMEWORK_TEMPLATE_IDS = [
  "homework-template-one",
  "secondary-homework-template-one",
] as const;

export type HomeworkTemplateId = (typeof HOMEWORK_TEMPLATE_IDS)[number];
export type HomeworkTemplateLevel = "primary" | "secondary";

export type HomeworkTemplateDefinition = {
  id: HomeworkTemplateId;
  title: string;
  subtitle: string;
  level: HomeworkTemplateLevel;
  sectionCount: number;
  estimatedMinutes: number | null;
  contentStatus: "ready" | "shell";
  parts: readonly {
    id: string;
    order: number;
    label: string;
  }[];
};

const HOMEWORK_TEMPLATE_DEFINITIONS: Record<
  HomeworkTemplateId,
  HomeworkTemplateDefinition
> = {
  "homework-template-one": {
    id: "homework-template-one",
    title: "Homework Template One",
    subtitle: "Reading, grammar, vocabulary, and writing practice",
    level: "primary",
    sectionCount: 6,
    estimatedMinutes: 30,
    contentStatus: "ready",
    parts: [
      { id: "picture-cloze", order: 1, label: "Picture cloze" },
      { id: "word-annotation", order: 2, label: "Word annotation" },
      { id: "sentence-columns", order: 3, label: "Sentence columns" },
      { id: "verb-table", order: 4, label: "Verb table" },
      { id: "picture-writing", order: 5, label: "Picture writing" },
      { id: "question-writing", order: 6, label: "Question writing" },
    ],
  },
  "secondary-homework-template-one": {
    id: "secondary-homework-template-one",
    title: "Secondary Homework One",
    subtitle: "Community action and simple-past practice for Grades 8–9",
    level: "secondary",
    sectionCount: 5,
    estimatedMinutes: 35,
    contentStatus: "ready",
    parts: [
      { id: "community-sequence", order: 1, label: "Read and order" },
      { id: "past-corrections", order: 2, label: "Correct the past tense" },
      { id: "irregular-dialogue", order: 3, label: "Complete the dialogue" },
      { id: "past-question-choice", order: 4, label: "Build past-tense questions" },
      { id: "community-speaking", order: 5, label: "Speaking response" },
    ],
  },
};

export function isHomeworkTemplateId(value: unknown): value is HomeworkTemplateId {
  return typeof value === "string" && HOMEWORK_TEMPLATE_IDS.includes(value as HomeworkTemplateId);
}

export function getHomeworkTemplateDefinition(
  value: unknown,
): HomeworkTemplateDefinition | null {
  return isHomeworkTemplateId(value) ? HOMEWORK_TEMPLATE_DEFINITIONS[value] : null;
}

export function isHomeworkTemplatePartId(
  templateId: HomeworkTemplateId,
  partId: string,
): boolean {
  return HOMEWORK_TEMPLATE_DEFINITIONS[templateId].parts.some((part) => part.id === partId);
}

export function homeworkTemplatePartLabel(
  templateId: HomeworkTemplateId,
  partId: string,
): string {
  return HOMEWORK_TEMPLATE_DEFINITIONS[templateId].parts.find((part) => part.id === partId)?.label ?? partId;
}

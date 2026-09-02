import type { HomeworkCollectionCreativePresentationPart } from "@/lib/homework-collections/types";

type CreativePresentationContent = Omit<
  HomeworkCollectionCreativePresentationPart,
  "schemaVersion" | "id" | "kind" | "title" | "instructions" | "required"
>;

const DEFAULT_CONTENT: CreativePresentationContent = {
  templateId: "vlog-plan-v1",
  idea: {
    textId: "idea-text",
    mediaId: "idea-media",
    question: "What is your VLOG about?",
    direction: "Write 2 or 3 sentences.",
    starters: ["My VLOG is about…", "I chose this because…", "People will see…"],
  },
  plan: {
    question: "What will happen in your VLOG?",
    direction: "Write short answers.",
    fields: [
      { id: "plan-where", label: "Where will you go?", starter: "I will go to…" },
      { id: "plan-show", label: "What will you show?", starter: "I will show…" },
      { id: "plan-who", label: "Who will you talk to?", starter: "I will talk to…" },
    ],
  },
  story: {
    question: "Show 3 parts of your VLOG.",
    direction: "Draw or add a photo for each part.",
    frames: [
      { id: "story-first", label: "First" },
      { id: "story-next", label: "Next" },
      { id: "story-last", label: "Last" },
    ],
  },
  opening: {
    textId: "opening-text",
    question: "What will you say first?",
    direction: "Write 3 or 4 sentences.",
    starters: ["Hi everyone!", "Today I am going to…", "Let's get started!"],
  },
  maxPoints: 20,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, fallback: string, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function cleanId(value: unknown, fallback: string): string {
  const cleaned = cleanText(value, fallback, 100).replace(/[^a-zA-Z0-9_-]/g, "-");
  return cleaned || fallback;
}

function cleanStarters(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const starters = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 5);
  return starters.length ? starters : [...fallback];
}

export function createCreativePresentationContent(): CreativePresentationContent {
  return structuredClone(DEFAULT_CONTENT);
}

export function parseCreativePresentationContent(raw: unknown): CreativePresentationContent {
  const row = isRecord(raw) ? raw : {};
  const idea = isRecord(row.idea) ? row.idea : {};
  const plan = isRecord(row.plan) ? row.plan : {};
  const story = isRecord(row.story) ? row.story : {};
  const opening = isRecord(row.opening) ? row.opening : {};

  const planFields = (Array.isArray(plan.fields) ? plan.fields : [])
    .slice(0, 3)
    .flatMap((value, index) => {
      if (!isRecord(value)) return [];
      const fallback = DEFAULT_CONTENT.plan.fields[index]!;
      return [{
        id: cleanId(value.id, fallback.id),
        label: cleanText(value.label, fallback.label, 160),
        starter: cleanText(value.starter, fallback.starter, 160),
      }];
    });
  const storyFrames = (Array.isArray(story.frames) ? story.frames : [])
    .slice(0, 3)
    .flatMap((value, index) => {
      if (!isRecord(value)) return [];
      const fallback = DEFAULT_CONTENT.story.frames[index]!;
      return [{
        id: cleanId(value.id, fallback.id),
        label: cleanText(value.label, fallback.label, 80),
      }];
    });

  return {
    templateId: "vlog-plan-v1",
    idea: {
      textId: cleanId(idea.textId, DEFAULT_CONTENT.idea.textId),
      mediaId: cleanId(idea.mediaId, DEFAULT_CONTENT.idea.mediaId),
      question: cleanText(idea.question, DEFAULT_CONTENT.idea.question),
      direction: cleanText(idea.direction, DEFAULT_CONTENT.idea.direction),
      starters: cleanStarters(idea.starters, DEFAULT_CONTENT.idea.starters),
    },
    plan: {
      question: cleanText(plan.question, DEFAULT_CONTENT.plan.question),
      direction: cleanText(plan.direction, DEFAULT_CONTENT.plan.direction),
      fields: planFields.length === 3 ? planFields : structuredClone(DEFAULT_CONTENT.plan.fields),
    },
    story: {
      question: cleanText(story.question, DEFAULT_CONTENT.story.question),
      direction: cleanText(story.direction, DEFAULT_CONTENT.story.direction),
      frames: storyFrames.length === 3 ? storyFrames : structuredClone(DEFAULT_CONTENT.story.frames),
    },
    opening: {
      textId: cleanId(opening.textId, DEFAULT_CONTENT.opening.textId),
      question: cleanText(opening.question, DEFAULT_CONTENT.opening.question),
      direction: cleanText(opening.direction, DEFAULT_CONTENT.opening.direction),
      starters: cleanStarters(opening.starters, DEFAULT_CONTENT.opening.starters),
    },
    maxPoints: Number.isFinite(row.maxPoints)
      ? Math.max(1, Math.min(100, Math.round(Number(row.maxPoints))))
      : DEFAULT_CONTENT.maxPoints,
  };
}

export function creativePresentationAnswerIds(part: HomeworkCollectionCreativePresentationPart): string[] {
  return [
    part.idea.textId,
    part.idea.mediaId,
    ...part.plan.fields.map((field) => field.id),
    ...part.story.frames.map((frame) => frame.id),
    part.opening.textId,
  ];
}

export function creativePresentationMediaIds(part: HomeworkCollectionCreativePresentationPart): string[] {
  return [part.idea.mediaId, ...part.story.frames.map((frame) => frame.id)];
}

export function creativePresentationStepAnswerIds(part: HomeworkCollectionCreativePresentationPart): string[][] {
  return [
    [part.idea.textId, part.idea.mediaId],
    part.plan.fields.map((field) => field.id),
    part.story.frames.map((frame) => frame.id),
    [part.opening.textId],
  ];
}

export function creativePresentationStepComplete(
  part: HomeworkCollectionCreativePresentationPart,
  answers: Record<string, string>,
  stepIndex: number,
): boolean {
  return (creativePresentationStepAnswerIds(part)[stepIndex] ?? []).every(
    (id) => Boolean(answers[id]?.trim()),
  );
}

export function creativePresentationValidationIssues(
  part: HomeworkCollectionCreativePresentationPart,
): string[] {
  const issues: string[] = [];
  [part.idea.question, part.plan.question, part.story.question, part.opening.question]
    .forEach((question, index) => {
      if (!question.trim()) issues.push(`Step ${index + 1} needs a question.`);
    });
  const ids = creativePresentationAnswerIds(part);
  if (new Set(ids).size !== ids.length) issues.push("VLOG response ids must be unique.");
  if (part.plan.fields.length !== 3) issues.push("The video plan needs three questions.");
  if (part.story.frames.length !== 3) issues.push("The visual plan needs three parts.");
  if (!Number.isInteger(part.maxPoints) || part.maxPoints < 1 || part.maxPoints > 100) {
    issues.push("Points must be between 1 and 100.");
  }
  return issues;
}

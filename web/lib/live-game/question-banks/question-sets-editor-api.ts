import type {
  LiveGameQuestionBank,
  LiveGameQuestionPayload,
  LiveGameQuestionRow,
  LiveGameQuestionSetEditorPayload,
} from "@/lib/live-game/question-banks/types";

export type MetadataPatch = Partial<{
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
}>;

export type CreateQuestionInput = {
  bank: LiveGameQuestionBank;
  prompt: string;
  payload: LiveGameQuestionPayload;
  enabled?: boolean;
};

export type QuestionPatch = Partial<{
  prompt: string;
  payload: LiveGameQuestionPayload;
  enabled: boolean;
}>;

export type ReorderItem = { id: string; sortOrder: number };

type ApiError = { error?: string; bank?: LiveGameQuestionBank; questionId?: string };

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return (await response.json()) as T;
}

export async function fetchQuestionSetForEditor(
  id: string,
): Promise<LiveGameQuestionSetEditorPayload> {
  const response = await fetch(`/api/live-game/question-sets/${id}`);
  return parseJson(response);
}

export async function updateQuestionSetMetadata(
  id: string,
  patch: MetadataPatch,
): Promise<LiveGameQuestionSetEditorPayload["set"]> {
  const response = await fetch(`/api/live-game/question-sets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const payload = await parseJson<{ set: LiveGameQuestionSetEditorPayload["set"] }>(response);
  return payload.set;
}

export async function duplicateQuestionSet(
  id: string,
): Promise<{ id: string; slug: string; title: string }> {
  const response = await fetch(`/api/live-game/question-sets/${id}/duplicate`, {
    method: "POST",
  });
  return parseJson(response);
}

export async function publishQuestionSet(
  id: string,
): Promise<{ id: string; version: number; status: "published"; warnings?: string[] }> {
  const response = await fetch(`/api/live-game/question-sets/${id}/publish`, {
    method: "POST",
  });
  return parseJson(response);
}

export async function createQuestion(
  setId: string,
  input: CreateQuestionInput,
): Promise<LiveGameQuestionRow> {
  const response = await fetch(`/api/live-game/question-sets/${setId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJson<{ question: LiveGameQuestionRow }>(response);
  return payload.question;
}

export async function updateQuestion(
  setId: string,
  questionId: string,
  patch: QuestionPatch,
): Promise<LiveGameQuestionRow> {
  const response = await fetch(
    `/api/live-game/question-sets/${setId}/questions/${questionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  const payload = await parseJson<{ question: LiveGameQuestionRow }>(response);
  return payload.question;
}

export async function deleteQuestion(setId: string, questionId: string): Promise<void> {
  const response = await fetch(
    `/api/live-game/question-sets/${setId}/questions/${questionId}`,
    { method: "DELETE" },
  );
  await parseJson(response);
}

export async function reorderQuestions(
  setId: string,
  bank: LiveGameQuestionBank,
  items: ReorderItem[],
): Promise<void> {
  const response = await fetch(`/api/live-game/question-sets/${setId}/questions/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bank, items }),
  });
  await parseJson(response);
}

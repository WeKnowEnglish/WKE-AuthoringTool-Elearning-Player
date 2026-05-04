import type { GenerateQuizOptions, Question, QuizSession } from "@/types/quiz-builder-brain";

export type QuizPreviewSaveBundle = {
  title: string;
  options: GenerateQuizOptions;
  quizSession: QuizSession;
};

const QUESTION_TYPES = new Set(["mcq", "fill_blank", "letter_scramble"]);
const LEVELS = new Set(["A1", "A2"]);
const MODES = new Set(["quick", "practice"]);

function isQuestion(x: unknown): x is Question {
  if (!x || typeof x !== "object") return false;
  const q = x as Record<string, unknown>;
  if (typeof q.id !== "string" || !q.id.trim()) return false;
  if (typeof q.type !== "string" || !QUESTION_TYPES.has(q.type)) return false;
  if (typeof q.prompt !== "string" || !q.prompt.trim()) return false;
  if (typeof q.correctAnswer !== "string" || !q.correctAnswer.trim()) return false;
  if (!Array.isArray(q.options)) return false;
  if (q.type === "mcq" && q.options.length !== 3) return false;
  if (q.type !== "mcq" && q.options.length !== 0) return false;
  const m = q.metadata;
  if (!m || typeof m !== "object") return false;
  const meta = m as Record<string, unknown>;
  if (typeof meta.structureId !== "string" || typeof meta.vocabId !== "string") return false;
  if (typeof meta.topic !== "string" || typeof meta.level !== "string") return false;
  if (!LEVELS.has(meta.level as "A1" | "A2")) return false;
  return true;
}

export function parseQuizPreviewBundle(raw: string): QuizPreviewSaveBundle | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const options = o.options as GenerateQuizOptions | undefined;
    const quizSession = o.quizSession as QuizSession | undefined;
    if (!title || !options || !quizSession) return null;
    return { title, options, quizSession };
  } catch {
    return null;
  }
}

/** Returns an error message, or null if valid. */
export function validateQuizPreviewBundle(bundle: QuizPreviewSaveBundle): string | null {
  if (!bundle.title.trim()) return "Title is required.";
  const { options, quizSession } = bundle;
  if (!options || typeof options !== "object") return "Missing generation options.";
  if (typeof options.topic !== "string" || !options.topic.trim()) return "Invalid topic in options.";
  if (!options.level || !LEVELS.has(options.level)) return "Invalid level in options.";
  if (!options.mode || !MODES.has(options.mode)) return "Invalid mode in options.";
  const qc = Number(options.questionCount);
  if (!Number.isFinite(qc) || qc < 1 || qc > 20) return "Invalid question count in options.";

  if (!quizSession?.meta || typeof quizSession.meta !== "object") return "Invalid quiz session.";
  const meta = quizSession.meta;
  if (meta.topic !== options.topic) return "Session topic does not match options (tamper check).";
  if (meta.level !== options.level) return "Session level does not match options (tamper check).";
  if (meta.mode !== options.mode) return "Session mode does not match options (tamper check).";

  const qs = quizSession.questions;
  if (!Array.isArray(qs) || qs.length === 0) return "Quiz has no questions.";
  if (qs.length !== options.questionCount) {
    return "Question count must match options.questionCount (save the preview exactly as generated).";
  }
  for (let i = 0; i < qs.length; i++) {
    if (!isQuestion(qs[i])) return `Invalid question at index ${i + 1}.`;
  }
  return null;
}

import {
  createBlankSession,
  exportQuizSession,
  sessionItemIds,
  validateQuizSession,
  type QuizSession,
} from "@/lib/activity-builder/games/quiz-builder-session";
import {
  activityTrackKindToStudioFormat,
  isLpGradedPackKind,
  type LpGradedPackKind,
} from "@/lib/activity-formats/registry";
import type { HomeworkStudioFormat } from "@/lib/class-homework/types";
import type { LessonScreenRow } from "@/lib/lesson/types";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";
import {
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionLessonPlayerPackPart,
} from "@/lib/homework-collections/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseStoredQuizSession(
  studioFormat: HomeworkStudioFormat,
  raw: unknown,
): QuizSession | null {
  if (!isRecord(raw) || raw.format !== studioFormat) return null;
  try {
    validateQuizSession(raw as QuizSession);
    return raw as QuizSession;
  } catch {
    return null;
  }
}

export function blankQuizSessionForStudioFormat(
  format: HomeworkStudioFormat,
): QuizSession {
  if (format === "learning_track") {
    throw new Error("Learning tracks cannot be embedded as homework collection packs.");
  }
  return createBlankSession(format);
}

export function exportPartFromQuizSession(session: QuizSession): {
  pack: Record<string, unknown>;
  title: string;
  authoringSession: QuizSession;
} {
  const exported = exportQuizSession(session);
  return {
    pack: exported.pack as Record<string, unknown>,
    title: exported.title,
    authoringSession: session,
  };
}

export function createLessonPlayerPackCollectionPart(
  format: HomeworkStudioFormat,
  id = crypto.randomUUID(),
): HomeworkCollectionLessonPlayerPackPart {
  let session = blankQuizSessionForStudioFormat(format);
  if (session.format === "flashcards") {
    session = {
      format: "flashcards",
      document: {
        ...session.document,
        interaction: {
          ...session.document.interaction,
          cards: session.document.interaction.cards.map((card, index) =>
            index === 0
              ? {
                  ...card,
                  faces: {
                    ...card.faces,
                    word: card.faces.word?.trim() ? card.faces.word : "new word",
                  },
                }
              : card,
          ),
        },
      },
    };
  }
  const exported = exportPartFromQuizSession(session);
  return {
    schemaVersion: HOMEWORK_COLLECTION_VERSION,
    id,
    kind: "lesson_player_pack",
    title: exported.title,
    instructions: "",
    required: true,
    studioFormat: format,
    pack: exported.pack,
    authoringSession: exported.authoringSession,
  };
}

export function seedLessonPlayerPackFromTrackKind(
  kind: LpGradedPackKind,
  id = crypto.randomUUID(),
): HomeworkCollectionLessonPlayerPackPart {
  return createLessonPlayerPackCollectionPart(activityTrackKindToStudioFormat(kind), id);
}

export function lessonPlayerPackItemIds(part: HomeworkCollectionLessonPlayerPackPart): string[] {
  const session = parseStoredQuizSession(part.studioFormat, part.authoringSession);
  if (session) return sessionItemIds(session);
  try {
    const view = spacePackToLessonScreens(part.studioFormat, part.pack, part.id);
    return view.screens.map((screen) => screen.id);
  } catch {
    return [];
  }
}

export function homeworkCollectionLessonPlayerScreens(
  part: HomeworkCollectionLessonPlayerPackPart,
): {
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
} {
  const view = spacePackToLessonScreens(part.studioFormat, part.pack, part.id);
  const itemIds = lessonPlayerPackItemIds(part);
  return {
    lessonId: view.lessonId,
    lessonTitle: view.lessonTitle,
    screens: view.screens.map((screen, index) => {
      const payload = isRecord(screen.payload) ? screen.payload : {};
      const itemId = itemIds[index] ?? screen.id;
      return {
        ...screen,
        payload: {
          ...payload,
          grading_part_id: part.id,
          grading_item_id: itemId,
          item_id: payload.item_id ?? itemId,
        },
      };
    }),
  };
}

function comparable(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truthyAnswer(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

/** Score auto-graded Lesson Player pack answers (completion formats use a separate path). */
export function scoreGradedLessonPlayerPackAnswers(
  part: HomeworkCollectionLessonPlayerPackPart,
  answers: Record<string, string>,
): number {
  const session = parseStoredQuizSession(part.studioFormat, part.authoringSession);
  if (!session) return 0;

  if (session.format === "true_false") {
    return session.document.interaction.items.reduce((total, item) => {
      const answer = answers[item.id];
      if (!answer) return total;
      const student = truthyAnswer(answer);
      return total + (student === item.correct ? 1 : 0);
    }, 0);
  }

  if (session.format === "fill_blanks") {
    return session.document.interaction.items.reduce((total, item) => {
      const raw = answers[item.id];
      if (!raw) return total;
      try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        if (!isRecord(parsed)) return total;
        const blanks = item.blanks;
        const blankCorrect = blanks.every((blank) => {
          const student = comparable(parsed[blank.id] ?? "");
          if (!student) return false;
          return blank.acceptable.some((option) => comparable(option) === student);
        });
        return total + (blankCorrect ? 1 : 0);
      } catch {
        return total;
      }
    }, 0);
  }

  return 0;
}

export function lessonPlayerPackValidationIssues(
  part: HomeworkCollectionLessonPlayerPackPart,
): string[] {
  const issues: string[] = [];
  const session = parseStoredQuizSession(part.studioFormat, part.authoringSession);
  if (!session) {
    issues.push("Quiz content is invalid. Re-open the editor or replace this activity.");
    return issues;
  }
  try {
    validateQuizSession(session);
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "Quiz content failed validation.",
    );
  }
  if (!isRecord(part.pack)) {
    issues.push("Lesson Player pack is missing.");
  }
  return issues;
}

export function isLpGradedPackTrackKind(kind: string): boolean {
  return isLpGradedPackKind(kind as LpGradedPackKind);
}

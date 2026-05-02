import { randomUUID } from "node:crypto";
import { buildAiGenerationDiagnostics } from "@/lib/ai/ai-generation-diagnostics";
import { searchTeacherMedia } from "@/lib/actions/media";
import { isCongratsEndScreen } from "@/lib/lesson-bookends";
import type { DraftScreenRow, MediaAllowlistItem, QuizGroupSpec } from "@/lib/ai/gemini";
import {
  formatLessonPlanMarkdown,
  generateLessonPlan,
  generateLessonScreensFromPlan,
  parseLessonPlanMetaFromText,
  safeParseStoredLessonPlanMeta,
  type AiLessonPlan,
} from "@/lib/ai/gemini";
import { quizGroupsForSpecs } from "@/lib/ai/ai-lesson-plan";

const MAX_ALLOWLIST = 24;

function vocabularyTerms(vocabulary: string): string[] {
  return Array.from(
    new Set(
      vocabulary
        .split(/[,;\n]/)
        .map((s) => s.trim().slice(0, 64))
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

/**
 * Build deduped image URL allowlist from plan hints + vocabulary.
 */
export async function buildMediaAllowlistForPlan(
  plan: AiLessonPlan,
  vocabulary: string,
): Promise<MediaAllowlistItem[]> {
  const terms = [
    ...plan.mediaSearchTerms,
    ...vocabularyTerms(vocabulary),
  ];
  const seen = new Set<string>();
  const out: MediaAllowlistItem[] = [];

  for (const q of terms) {
    if (out.length >= MAX_ALLOWLIST) break;
    if (!q.trim()) continue;
    try {
      const { rows } = await searchTeacherMedia({ q, kind: "image", limit: 8 });
      for (const row of rows) {
        const url = row.public_url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        out.push({
          url,
          description: row.meta_item_name ?? row.original_filename ?? undefined,
        });
        if (out.length >= MAX_ALLOWLIST) break;
      }
    } catch {
      /* search optional — lesson still generates with placeholders */
    }
  }
  return out;
}

function stripExtraOpeningStarts(screens: DraftScreenRow[], omitOpeningStart: boolean): DraftScreenRow[] {
  if (!omitOpeningStart) return screens;
  const next = [...screens];
  while (next.length > 0) {
    const first = next[0];
    if (
      first.screen_type === "start" &&
      !isCongratsEndScreen(first.screen_type, first.payload)
    ) {
      next.shift();
      continue;
    }
    break;
  }
  return next;
}

function quizSpecsFromPlan(plan: AiLessonPlan): QuizGroupSpec[] {
  const groups = quizGroupsForSpecs(plan);
  return groups.map((g) => ({
    id: randomUUID(),
    title: g.title,
    questionCount: g.questionCount,
  }));
}

export type OrchestrateTeacherLessonInput = {
  title: string;
  cefrBand: string;
  learningGoals: string[];
  vocabulary: string;
  premise: string;
  omitOpeningStart: boolean;
};

export type OrchestrateTeacherLessonResult = {
  plan: AiLessonPlan;
  screens: DraftScreenRow[];
  /** Dropped model rows that failed Zod (often story payloads). */
  parseWarnings: string[];
  diagnostics: ReturnType<typeof buildAiGenerationDiagnostics>;
};

export async function orchestrateTeacherLessonAi(
  input: OrchestrateTeacherLessonInput,
): Promise<OrchestrateTeacherLessonResult> {
  const plan = await generateLessonPlan({
    title: input.title,
    cefrBand: input.cefrBand,
    learningGoals: input.learningGoals,
    vocabulary: input.vocabulary,
    premise: input.premise,
  });

  const mediaAllowlist = await buildMediaAllowlistForPlan(plan, input.vocabulary);

  const quizGroupSpecs = quizSpecsFromPlan(plan);

  const lessonPlanText = formatLessonPlanMarkdown(plan, {
    title: input.title,
    cefrBand: input.cefrBand,
    learningGoals: input.learningGoals,
    seedPrompt: input.premise,
  });

  const {
    screens: rawScreens,
    parseWarnings,
    modelScreensArrayLength,
    validatedScreenCount,
    failedScreens,
  } = await generateLessonScreensFromPlan({
    title: input.title,
    cefrBand: input.cefrBand,
    learningGoals: input.learningGoals,
    vocabulary: input.vocabulary,
    premise: input.premise,
    lessonPlanText,
    plan,
    mediaAllowlist,
    quizGroupSpecs,
    omitOpeningStart: input.omitOpeningStart,
  });

  const screens = stripExtraOpeningStarts(rawScreens, input.omitOpeningStart);
  const diagnostics = buildAiGenerationDiagnostics({
    modelScreensArrayLength,
    validatedScreenCount,
    returnedScreenCount: screens.length,
    parseWarnings,
    failedScreens,
  });

  return { plan, screens, parseWarnings, diagnostics };
}

export type OrchestrateScreensFromDocumentInput = {
  title: string;
  cefrBand: string;
  learningGoals: string[];
  vocabulary: string;
  premiseLine: string;
  lessonPlanText: string;
  /** When present and valid, used instead of re-parsing markdown. */
  lessonPlanMeta?: unknown;
  omitOpeningStart: boolean;
};

/**
 * Resolve structured plan: prefer stored DB meta if valid; else parse markdown.
 */
export async function resolveLessonPlanForGeneration(
  lessonPlanText: string,
  lessonPlanMeta?: unknown,
): Promise<AiLessonPlan> {
  const fromDb = safeParseStoredLessonPlanMeta(lessonPlanMeta);
  if (fromDb) return fromDb;
  return parseLessonPlanMetaFromText(lessonPlanText);
}

/**
 * Build screens from the saved lesson plan document (authoritative text + optional meta).
 */
export type OrchestrateScreensFromDocumentResult = {
  screens: DraftScreenRow[];
  parseWarnings: string[];
  diagnostics: ReturnType<typeof buildAiGenerationDiagnostics>;
};

export async function orchestrateScreensFromLessonDocument(
  input: OrchestrateScreensFromDocumentInput,
): Promise<OrchestrateScreensFromDocumentResult> {
  const plan = await resolveLessonPlanForGeneration(input.lessonPlanText, input.lessonPlanMeta);
  const mediaAllowlist = await buildMediaAllowlistForPlan(plan, input.vocabulary);
  const quizGroupSpecs = quizSpecsFromPlan(plan);
  const {
    screens: rawScreens,
    parseWarnings,
    modelScreensArrayLength,
    validatedScreenCount,
    failedScreens,
  } = await generateLessonScreensFromPlan({
    title: input.title,
    cefrBand: input.cefrBand,
    learningGoals: input.learningGoals,
    vocabulary: input.vocabulary,
    premise: input.premiseLine,
    lessonPlanText: input.lessonPlanText,
    plan,
    mediaAllowlist,
    quizGroupSpecs,
    omitOpeningStart: input.omitOpeningStart,
  });
  const screens = stripExtraOpeningStarts(rawScreens, input.omitOpeningStart);
  const diagnostics = buildAiGenerationDiagnostics({
    modelScreensArrayLength,
    validatedScreenCount,
    returnedScreenCount: screens.length,
    parseWarnings,
    failedScreens,
  });
  return { screens, parseWarnings, diagnostics };
}

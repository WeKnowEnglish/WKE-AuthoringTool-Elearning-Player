import { NextResponse } from "next/server";
import {
  orchestrateScreensFromLessonDocument,
  orchestrateTeacherLessonAi,
} from "@/lib/ai/orchestrate-teacher-lesson";
import { normalizeLessonPlanText } from "@/lib/lesson-plan";
import { parseLearningGoalsFromDb } from "@/lib/learning-goals";
import { createClient } from "@/lib/supabase/server";
import { rateLimitAllow } from "@/lib/rate-limit/memory";

const AI_WINDOW_MS = 60 * 60 * 1000;
const AI_MAX_PER_WINDOW = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimitAllow(`ai:${user.id}`, AI_MAX_PER_WINDOW, AI_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many AI requests. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";

    if (lessonId) {
      const { data: lesson, error: lecErr } = await supabase
        .from("lessons")
        .select("title, learning_goals, lesson_plan, lesson_plan_meta")
        .eq("id", lessonId)
        .single();
      if (lecErr || !lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }

      const lessonPlanText = normalizeLessonPlanText(
        String((lesson as { lesson_plan?: unknown }).lesson_plan ?? ""),
      );
      if (!lessonPlanText.trim()) {
        return NextResponse.json(
          {
            error:
              "Lesson plan is empty. Open Plan → Draft plan with AI, or paste a plan, then try again.",
          },
          { status: 400 },
        );
      }

      const learningGoals = parseLearningGoalsFromDb(
        (lesson as { learning_goals?: unknown }).learning_goals,
      );
      if (learningGoals.length === 0) {
        return NextResponse.json(
          { error: "learningGoals must include at least one non-empty objective" },
          { status: 400 },
        );
      }

      const title = String(lesson.title ?? "").trim();
      const cefrBand = String(body.cefrBand ?? body.gradeBand ?? "a1").trim();
      const vocabulary = String(body.vocabulary ?? "").trim();
      const hasOpeningStart = body.hasOpeningStart === true;
      const premiseLine =
        String(body.premiseLine ?? body.premise ?? "").trim() || title;

      const lessonPlanMeta = (lesson as { lesson_plan_meta?: unknown }).lesson_plan_meta;

      const { screens, parseWarnings, diagnostics } = await orchestrateScreensFromLessonDocument({
        title,
        cefrBand,
        learningGoals,
        vocabulary,
        premiseLine,
        lessonPlanText,
        lessonPlanMeta,
        omitOpeningStart: hasOpeningStart,
      });

      return NextResponse.json({
        screens,
        generationWarnings: parseWarnings,
        aiGenerationDiagnostics: diagnostics,
      });
    }

    const title = String(body.title ?? "").trim();
    const cefrBand = String(body.cefrBand ?? body.gradeBand ?? "a1").trim();
    const premise = String(body.premise ?? "").trim();
    const vocabulary = String(body.vocabulary ?? "").trim();
    const hasOpeningStart = body.hasOpeningStart === true;

    const rawGoals = body.learningGoals;
    const learningGoals =
      Array.isArray(rawGoals) ?
        rawGoals.map((g: unknown) => String(g ?? "").trim()).filter(Boolean)
      : [];

    if (!title || !premise) {
      return NextResponse.json(
        { error: "title and premise are required" },
        { status: 400 },
      );
    }
    if (learningGoals.length === 0) {
      return NextResponse.json(
        { error: "learningGoals must include at least one non-empty objective" },
        { status: 400 },
      );
    }

    const { plan, screens, parseWarnings, diagnostics } = await orchestrateTeacherLessonAi({
      title,
      cefrBand,
      learningGoals,
      vocabulary,
      premise,
      omitOpeningStart: hasOpeningStart,
    });

    return NextResponse.json({
      plan,
      screens,
      generationWarnings: parseWarnings,
      aiGenerationDiagnostics: diagnostics,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

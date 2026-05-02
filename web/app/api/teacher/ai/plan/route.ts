import { NextResponse } from "next/server";
import {
  enhanceLessonPlanCollaborative,
  formatLessonPlanMarkdown,
  generateLessonPlan,
  safeParseStoredLessonPlanMeta,
  validateEnhancerStructureInvariants,
  type AiLessonPlan,
} from "@/lib/ai/gemini";
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
    const lessonId = String(body.lessonId ?? "").trim();
    const cefrBand = String(body.cefrBand ?? body.gradeBand ?? "a1").trim();
    const premise = String(body.premise ?? body.seed ?? "").trim();
    const vocabulary = String(body.vocabulary ?? "").trim();
    const existingLessonPlan = normalizeLessonPlanText(
      String(body.existingLessonPlan ?? body.lessonPlan ?? ""),
    );

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    const { data: lesson, error: lecErr } = await supabase
      .from("lessons")
      .select("id, title, learning_goals, lesson_plan_meta")
      .eq("id", lessonId)
      .single();
    if (lecErr || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const title = String(lesson.title ?? "").trim();
    const learningGoals = parseLearningGoalsFromDb(
      (lesson as { learning_goals?: unknown }).learning_goals,
    );
    if (learningGoals.length === 0) {
      return NextResponse.json(
        { error: "Save at least one learning objective before drafting a plan" },
        { status: 400 },
      );
    }

    let markdown: string;
    let meta: AiLessonPlan;

    if (existingLessonPlan.trim()) {
      const existingMeta = (lesson as { lesson_plan_meta?: unknown }).lesson_plan_meta;
      const existingPlan = safeParseStoredLessonPlanMeta(existingMeta);
      const enhanced = await enhanceLessonPlanCollaborative({
        title,
        cefrBand,
        learningGoals,
        vocabulary,
        existingMarkdown: existingLessonPlan,
        optionalPremise: premise || undefined,
        existingPlanMeta: existingMeta,
      });
      markdown = normalizeLessonPlanText(enhanced.markdown);
      meta = enhanced.plan;
      if (existingPlan?.storyFirstBlueprint) {
        const check = validateEnhancerStructureInvariants(existingPlan, enhanced.plan);
        if (!check.ok) {
          meta = existingPlan;
        }
      }
    } else {
      if (!premise) {
        return NextResponse.json(
          { error: "premise (seed) is required when the plan document is empty" },
          { status: 400 },
        );
      }
      meta = await generateLessonPlan({
        title,
        cefrBand,
        learningGoals,
        vocabulary,
        premise,
      });
      markdown = normalizeLessonPlanText(
        formatLessonPlanMarkdown(meta, {
          title,
          cefrBand,
          learningGoals,
          seedPrompt: premise,
        }),
      );
    }

    const { error: upErr } = await supabase
      .from("lessons")
      .update({
        lesson_plan: markdown,
        lesson_plan_meta: meta as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ lessonPlan: markdown, meta });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plan draft failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

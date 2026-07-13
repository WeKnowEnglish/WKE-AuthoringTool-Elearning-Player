import { NextResponse } from "next/server";
import {
  QuestionSetAccessError,
  requireDraftSetAccess,
} from "@/lib/live-game/server/question-set-access";
import {
  fetchQuestionSetForEditor,
  publishQuestionSetRow,
} from "@/lib/live-game/server/question-set-editor-repository";
import { validateSetForPublish } from "@/lib/live-game/server/question-set-publish";
import { invalidateQuestionSetCache } from "@/lib/live-game/server/question-set-resolver";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const payload = await fetchQuestionSetForEditor(access.supabase, id);
    if (!payload) {
      return NextResponse.json({ error: "Question set not found." }, { status: 404 });
    }

    const allQuestions = [
      ...payload.questions.harvest,
      ...payload.questions.deposit,
      ...payload.questions.craft,
    ];
    const validation = validateSetForPublish(payload.set, allQuestions);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
          bank: validation.bank,
          questionId: validation.questionId,
        },
        { status: 400 },
      );
    }

    const nextVersion = payload.set.version + 1;
    const published = await publishQuestionSetRow(access.supabase, id, nextVersion);
    if (!published) {
      return NextResponse.json({ error: "Could not publish question set." }, { status: 503 });
    }

    invalidateQuestionSetCache(published.id);
    invalidateQuestionSetCache(published.slug);

    return NextResponse.json({
      id: published.id,
      version: published.version,
      status: published.status,
      warnings: validation.warnings,
    });
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Live-game question set publish failed", error);
    return NextResponse.json(
      { error: "Could not publish question set right now." },
      { status: 503 },
    );
  }
}

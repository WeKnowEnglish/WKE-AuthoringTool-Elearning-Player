import { NextResponse } from "next/server";
import { z } from "zod";
import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import {
  QuestionSetAccessError,
  requireDraftSetAccess,
} from "@/lib/live-game/server/question-set-access";
import {
  deleteQuestionRow,
  updateQuestionRow,
} from "@/lib/live-game/server/question-set-editor-repository";

export const dynamic = "force-dynamic";

const patchQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000).optional(),
    payload: z.unknown().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one question field is required.",
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; qid: string }> },
) {
  const { id, qid } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const body = patchQuestionSchema.parse(await request.json());
    const patch: Parameters<typeof updateQuestionRow>[3] = {};
    if (body.prompt != null) patch.prompt = body.prompt;
    if (body.enabled != null) patch.enabled = body.enabled;
    if (body.payload != null) {
      try {
        patch.payload = parseQuestionPayload(body.payload);
      } catch (parseError) {
        const message =
          parseError instanceof Error ? parseError.message : "Invalid question payload.";
        return NextResponse.json({ error: message, questionId: qid }, { status: 400 });
      }
    }

    const question = await updateQuestionRow(access.supabase, id, qid, patch);
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid question." }, { status: 400 });
    }
    console.error("Live-game question update failed", error);
    return NextResponse.json({ error: "Could not update question right now." }, { status: 503 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; qid: string }> },
) {
  const { id, qid } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const deleted = await deleteQuestionRow(access.supabase, id, qid);
    if (!deleted) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Live-game question delete failed", error);
    return NextResponse.json({ error: "Could not delete question right now." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  QuestionSetAccessError,
  requireDraftSetAccess,
  requirePublishedOrDraftSetRead,
} from "@/lib/live-game/server/question-set-access";
import {
  fetchQuestionSetForEditor,
  updateQuestionSetMetadata,
} from "@/lib/live-game/server/question-set-editor-repository";

export const dynamic = "force-dynamic";

const metadataPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    level: z.enum(["A1", "A2"]).optional(),
    topic: z.string().trim().max(200).optional(),
    learningObjective: z.string().trim().max(500).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one metadata field is required.",
  });

function handleAccessError(error: unknown) {
  if (error instanceof QuestionSetAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requirePublishedOrDraftSetRead(id);
    const payload = await fetchQuestionSetForEditor(access.supabase, id);
    if (!payload) {
      return NextResponse.json({ error: "Question set not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const access = handleAccessError(error);
    if (access) return access;
    console.error("Live-game question set load failed", error);
    return NextResponse.json(
      { error: "Could not load question set right now." },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const body = metadataPatchSchema.parse(await request.json());
    const set = await updateQuestionSetMetadata(access.supabase, id, body);
    if (!set) {
      return NextResponse.json({ error: "Could not update question set." }, { status: 503 });
    }
    return NextResponse.json({ set });
  } catch (error) {
    const access = handleAccessError(error);
    if (access) return access;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid metadata." }, { status: 400 });
    }
    console.error("Live-game question set metadata update failed", error);
    return NextResponse.json(
      { error: "Could not update question set right now." },
      { status: 503 },
    );
  }
}

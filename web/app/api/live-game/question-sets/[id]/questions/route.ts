import { NextResponse } from "next/server";
import { z } from "zod";
import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import {
  QuestionSetAccessError,
  requireDraftSetAccess,
} from "@/lib/live-game/server/question-set-access";
import {
  getMaxSortOrderForBank,
  insertQuestionRow,
} from "@/lib/live-game/server/question-set-editor-repository";

export const dynamic = "force-dynamic";

const createQuestionSchema = z.object({
  bank: z.enum(["harvest", "deposit", "craft"]),
  prompt: z.string().trim().min(1).max(2000),
  payload: z.unknown(),
  enabled: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const body = createQuestionSchema.parse(await request.json());
    let payload;
    try {
      payload = parseQuestionPayload(body.payload);
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : "Invalid question payload.";
      return NextResponse.json({ error: message, bank: body.bank }, { status: 400 });
    }

    const maxSort = await getMaxSortOrderForBank(access.supabase, id, body.bank);
    const question = await insertQuestionRow(access.supabase, {
      setId: id,
      bank: body.bank,
      prompt: body.prompt,
      payload,
      enabled: body.enabled,
      sortOrder: maxSort + 1,
    });
    if (!question) {
      return NextResponse.json({ error: "Could not create question." }, { status: 503 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid question." }, { status: 400 });
    }
    console.error("Live-game question create failed", error);
    return NextResponse.json({ error: "Could not create question right now." }, { status: 503 });
  }
}

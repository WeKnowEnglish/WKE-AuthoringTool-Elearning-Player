import { NextResponse } from "next/server";
import { z } from "zod";
import {
  QuestionSetAccessError,
  requireDraftSetAccess,
} from "@/lib/live-game/server/question-set-access";
import { reorderQuestionRows } from "@/lib/live-game/server/question-set-editor-repository";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  bank: z.enum(["harvest", "deposit", "craft"]),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requireDraftSetAccess(id);
    const body = reorderSchema.parse(await request.json());
    const ok = await reorderQuestionRows(access.supabase, id, body.bank, body.items);
    if (!ok) {
      return NextResponse.json({ error: "Could not reorder questions." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid reorder payload." }, { status: 400 });
    }
    console.error("Live-game question reorder failed", error);
    return NextResponse.json({ error: "Could not reorder questions right now." }, { status: 503 });
  }
}

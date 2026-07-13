import { NextResponse } from "next/server";
import {
  QuestionSetAccessError,
  requireDuplicateSourceAccess,
} from "@/lib/live-game/server/question-set-access";
import { duplicateQuestionSetForTeacher } from "@/lib/live-game/server/question-set-duplicate";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const access = await requireDuplicateSourceAccess(id);
    const result = await duplicateQuestionSetForTeacher(
      id,
      access.userId,
      access.supabase,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuestionSetAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Could not duplicate question set.";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Live-game question set duplicate failed", error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

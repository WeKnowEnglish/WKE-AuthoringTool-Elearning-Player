import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getSentenceStripRound,
  listSentenceStripBoards,
  openSentenceStripBoards,
  returnSentenceStripBoard,
  submitSentenceStripBoard,
} from "@/lib/sentence-strip/server/store";
import { assembleSentence } from "@/lib/sentence-strip/domain";

type RouteContext = { params: Promise<{ sessionId: string }> };

function decodeToken(raw: string | undefined): {
  joinCode: string;
  userId: string;
  role: "host" | "player";
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      joinCode?: string;
      userId?: string;
      role?: "host" | "player";
    };
    if (!parsed.joinCode || !parsed.userId || (parsed.role !== "host" && parsed.role !== "player")) {
      return null;
    }
    return { joinCode: parsed.joinCode, userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const joinCode = sessionId.toUpperCase();
  const round = getSentenceStripRound(joinCode);
  if (!round) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const cookieStore = await cookies();
  const token = decodeToken(cookieStore.get("wke-sentence-strip")?.value);
  if (!token || token.joinCode !== joinCode) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json({
    phase: round.phase,
    prompt: {
      title: round.prompt.title,
      instructions: round.prompt.instructions,
      tiles: round.prompt.tiles,
      targetSentence: token.role === "host" ? round.prompt.targetSentence : undefined,
    },
    boards:
      token.role === "host"
        ? listSentenceStripBoards(joinCode).map((b) => ({
            ...b,
            sentence: assembleSentence(round.prompt.tiles, b.orderedTileIds),
          }))
        : undefined,
    myBoard:
      token.role === "player"
        ? round.boards[`strip:student:${token.userId}`] ?? null
        : undefined,
    role: token.role,
    userId: token.userId,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const joinCode = sessionId.toUpperCase();
  const cookieStore = await cookies();
  const token = decodeToken(cookieStore.get("wke-sentence-strip")?.value);
  if (!token || token.joinCode !== joinCode) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { type?: string; orderedTileIds?: string[]; boardId?: string; feedback?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.type === "OPEN_BOARDS") {
    if (token.role !== "host") return NextResponse.json({ error: "Host only." }, { status: 403 });
    openSentenceStripBoards(joinCode);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "SUBMIT") {
    if (token.role !== "player") return NextResponse.json({ error: "Player only." }, { status: 403 });
    const result = submitSentenceStripBoard({
      joinCode,
      studentId: token.userId,
      orderedTileIds: body.orderedTileIds ?? [],
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  if (body.type === "RETURN_BOARD") {
    if (token.role !== "host") return NextResponse.json({ error: "Host only." }, { status: 403 });
    if (!body.boardId) return NextResponse.json({ error: "boardId required." }, { status: 400 });
    const result = returnSentenceStripBoard({
      joinCode,
      boardId: body.boardId,
      feedback: body.feedback,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown command." }, { status: 400 });
}

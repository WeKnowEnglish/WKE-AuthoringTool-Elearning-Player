import { NextResponse } from "next/server";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import {
  ensureStudentStripBoard,
  getSentenceStripRound,
} from "@/lib/sentence-strip/server/store";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

type Body = { joinCode?: string };

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const joinCode = body.joinCode?.trim().toUpperCase() ?? "";
  if (!isValidJoinCode(joinCode)) {
    return NextResponse.json({ error: "Invalid join code." }, { status: 400 });
  }

  const round = getSentenceStripRound(joinCode);
  if (!round) {
    return NextResponse.json({ error: "Round not found. Ask your teacher to start again." }, { status: 404 });
  }
  if (!round.classId) {
    return NextResponse.json({ error: "Round is not class-bound." }, { status: 400 });
  }

  let student: { userId: string; displayName: string };
  try {
    student = await requireWhiteboardStudent(round.classId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const board = ensureStudentStripBoard(joinCode, student.userId);
  if (!board) {
    return NextResponse.json({ error: "Could not create board." }, { status: 500 });
  }

  const token = Buffer.from(
    JSON.stringify({
      joinCode,
      userId: student.userId,
      role: "player",
      displayName: student.displayName,
    }),
    "utf8",
  ).toString("base64url");

  const response = NextResponse.json({
    sessionId: joinCode,
    joinCode,
    roundId: round.roundId,
    classId: round.classId,
    userId: student.userId,
    displayName: student.displayName,
    boardId: board.boardId,
    kind: "sentence_strip",
  });

  response.cookies.set("wke-sentence-strip", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return response;
}

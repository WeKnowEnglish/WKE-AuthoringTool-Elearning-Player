import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { createSentenceStripRound } from "@/lib/sentence-strip/server/store";
import { createDefaultPrompt } from "@/lib/sentence-strip/domain";

type RouteContext = { params: Promise<{ classId: string }> };

type Body = {
  title?: string;
  instructions?: string;
  timerMinutes?: number;
  tiles?: { id: string; text: string }[];
  targetSentence?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { classId } = await context.params;

  let teacher: { userId: string; displayName: string };
  try {
    teacher = await requireWhiteboardTeacher(classId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const joinCode = generateJoinCode();
  const defaults = createDefaultPrompt();
  const prompt = {
    title: body.title?.trim() || defaults.title,
    instructions: body.instructions?.trim() || defaults.instructions,
    tiles: body.tiles?.length ? body.tiles : defaults.tiles,
    targetSentence: body.targetSentence?.trim() || defaults.targetSentence,
  };

  const round = createSentenceStripRound({
    joinCode,
    hostUserId: teacher.userId,
    classId,
    prompt,
    timerMinutes: body.timerMinutes,
  });

  const hostToken = Buffer.from(
    JSON.stringify({
      joinCode,
      userId: teacher.userId,
      role: "host",
      secret: randomBytes(8).toString("hex"),
    }),
    "utf8",
  ).toString("base64url");

  const response = NextResponse.json({
    sessionId: joinCode,
    joinCode,
    roundId: round.roundId,
    classId,
    userId: teacher.userId,
    displayName: teacher.displayName,
    kind: "sentence_strip",
  });

  response.cookies.set("wke-sentence-strip", hostToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return response;
}

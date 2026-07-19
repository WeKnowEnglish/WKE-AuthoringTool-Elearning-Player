import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeWhiteboardPlayerToken,
  whiteboardHostMatchesSession,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { boardDocumentFromJson } from "@/lib/whiteboard/serialization";
import { boardToSvgString } from "@/lib/whiteboard/svg-export";
import { renderBoardPng } from "@/lib/whiteboard/server/render-preview";
import type { BoardBackground } from "@/lib/whiteboard/domain";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const roomId = toWhiteboardRoomId(sessionId.toUpperCase());
  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(WHITEBOARD_HOST_COOKIE)?.value ?? null;
  const player = decodeWhiteboardPlayerToken(
    cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value,
  );
  const allowed =
    whiteboardHostMatchesSession(hostCookie, sessionId.toUpperCase()) ||
    player?.roomId === roomId;
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const url = new URL(request.url);
  const boardId = url.searchParams.get("boardId");
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  if (!boardId) {
    return NextResponse.json({ error: "boardId required." }, { status: 400 });
  }

  const liveblocks = getLiveblocksServerClient();
  let documentJson: string | null = null;
  let background: BoardBackground | null = null;

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const runtime = (root as { get: (k: string) => { get: (k: string) => unknown } }).get(
      "runtime",
    );
    background = (runtime?.get("background") as BoardBackground) ?? null;
    const boards = (root as { get: (k: string) => { get: (id: string) => { get: (k: string) => unknown } } }).get(
      "boards",
    );
    const board = boards?.get(boardId);
    if (!board) return;
    const submissions = (root as { get: (k: string) => { entries: () => IterableIterator<[string, { get: (k: string) => unknown }]> } }).get(
      "submissions",
    );
    for (const [, sub] of submissions.entries()) {
      if (sub.get("boardId") === boardId) {
        documentJson = sub.get("documentJson") as string;
      }
    }
    if (!documentJson) {
      // Build from live board
      const elementsMap = board.get("elements") as {
        entries: () => IterableIterator<[string, unknown]>;
      };
      const zOrder = board.get("zOrder") as Iterable<string>;
      const elements: Record<string, unknown> = {};
      for (const [id, el] of elementsMap.entries()) elements[id] = el;
      documentJson = JSON.stringify({
        id: boardId,
        ownerType: board.get("ownerType"),
        ownerId: board.get("ownerId"),
        status: board.get("status"),
        revision: board.get("revision"),
        elements: Object.values(elements),
        zOrder: [...zOrder],
      });
    }
  });

  if (!documentJson) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const document = boardDocumentFromJson(documentJson);
  if (format === "svg") {
    const svg = boardToSvgString({
      elements: document.elements,
      background,
      annotations: document.annotations,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${boardId}.svg"`,
      },
    });
  }

  const png = await renderBoardPng({ document, background, maxWidth: 1600 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${boardId}.png"`,
    },
  });
}

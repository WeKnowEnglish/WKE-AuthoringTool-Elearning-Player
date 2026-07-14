import { NextResponse } from "next/server";
import type { LiveGameDiagnosticEvent } from "@/lib/live-game/diagnostics/types";
import {
  appendLiveGameDiagnosticEvents,
  readLiveGameDiagnosticEvents,
} from "@/lib/live-game/diagnostics/server-store";

export const dynamic = "force-dynamic";

function available() {
  return process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_LIVE_GAME_DIAGNOSTICS !== "0";
}
export async function POST(request: Request) {
  if (!available()) return new NextResponse(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { events?: LiveGameDiagnosticEvent[] } | null;
  if (!Array.isArray(body?.events)) return NextResponse.json({ error: "events required" }, { status: 400 });
  appendLiveGameDiagnosticEvents(body.events.slice(-100));
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  if (!available()) return new NextResponse(null, { status: 404 });
  const roomId = new URL(request.url).searchParams.get("roomId") ?? undefined;
  return NextResponse.json({ events: readLiveGameDiagnosticEvents(roomId) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeWhiteboardPlayerToken,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import type { WhiteboardTemplateConfig } from "@/lib/whiteboard/domain";
import { EMPTY_BACKGROUND } from "@/lib/whiteboard/domain";
import { listTemplates, saveTemplate } from "@/lib/whiteboard/server/persistence";

export async function GET() {
  const cookieStore = await cookies();
  const player = decodeWhiteboardPlayerToken(
    cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value,
  );
  // Allow listing by userId query for host landing before cookie exists
  return NextResponse.json({ templates: player ? await listTemplates(player.userId) : [] });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const record = body as {
    userId?: string;
    template?: WhiteboardTemplateConfig;
  };
  const userId = record.userId?.trim();
  if (!userId || !record.template) {
    return NextResponse.json({ error: "userId and template required." }, { status: 400 });
  }

  const template: WhiteboardTemplateConfig = {
    ...record.template,
    background: record.template.background ?? EMPTY_BACKGROUND,
    settings: record.template.settings ?? {},
    stampPackId: record.template.stampPackId || "default",
  };

  const saved = await saveTemplate(userId, template);
  return NextResponse.json({ template: saved });
}

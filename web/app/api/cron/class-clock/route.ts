import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  listClassIdsWithUpcomingSlots,
  tickClassClock,
} from "@/lib/class-schedule/ensure-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const header =
    request.headers.get("authorization")?.trim() ||
    request.headers.get("x-cron-secret")?.trim() ||
    "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : header;
  if (!bearer) return false;
  try {
    const a = Buffer.from(bearer);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Ensure waiting @ T−15 and promote live @ T−5 for classes with nearby slots. */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured.", code: "cron_unconfigured" },
      { status: 503 },
    );
  }
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const classIds = await listClassIdsWithUpcomingSlots();
  let created = 0;
  let promoted = 0;
  for (const classId of classIds) {
    try {
      const result = await tickClassClock(classId);
      if (result.created) created += 1;
      if (result.promoted) promoted += 1;
    } catch {
      // continue other classes
    }
  }
  return NextResponse.json({
    ok: true,
    scanned: classIds.length,
    created,
    promoted,
  });
}

export async function GET(request: Request) {
  return POST(request);
}

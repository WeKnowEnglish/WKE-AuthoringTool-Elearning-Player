import { NextResponse } from "next/server";
import { runDailyMaintenanceCleanup } from "@/lib/daily/cleanup";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cronSecretConfigured(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

function authorizeCron(request: Request): boolean {
  const expected = cronSecretConfigured();
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

/**
 * Phase 3c: clear expired/ended Daily rooms + prune old webhook event rows.
 * Auth: `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!cronSecretConfigured()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured.", code: "cron_unconfigured" },
      { status: 503 },
    );
  }
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { error: "Unauthorized.", code: "unauthorized" },
      { status: 401 },
    );
  }

  let roomLimit: number | undefined;
  let webhookRetentionDays: number | undefined;
  try {
    const body = (await request.json()) as {
      roomLimit?: number;
      webhookRetentionDays?: number;
    };
    if (typeof body.roomLimit === "number") roomLimit = body.roomLimit;
    if (typeof body.webhookRetentionDays === "number") {
      webhookRetentionDays = body.webhookRetentionDays;
    }
  } catch {
    // empty body is fine
  }

  const result = await runDailyMaintenanceCleanup({
    roomLimit,
    webhookRetentionDays,
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}

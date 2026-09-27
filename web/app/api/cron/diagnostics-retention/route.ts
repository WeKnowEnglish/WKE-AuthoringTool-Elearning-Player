import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization")?.trim() ?? "";
  const received = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : header;
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json({ error: "Diagnostics storage is unavailable." }, { status: 503 });
  }
  const { data, error } = await service.rpc("prune_platform_usage_events");
  if (error) {
    return NextResponse.json({ error: "Diagnostics retention failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: Number(data ?? 0), retentionDays: 60 });
}

export const POST = GET;

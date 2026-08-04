import { NextResponse } from "next/server";
import { processDailyWebhookBody } from "@/lib/daily/process-webhook";
import { logDaily } from "@/lib/daily/log";
import {
  isDailyWebhookTestBody,
  verifyDailyWebhookSignature,
} from "@/lib/daily/webhook-verify";

export const runtime = "nodejs";

/**
 * Daily domain webhooks (participant.joined / participant.left).
 * Register: POST https://api.daily.co/v1/webhooks
 *   { "url": "https://YOUR_APP/api/webhooks/daily",
 *     "eventTypes": ["participant.joined", "participant.left"],
 *     "hmac": "<base64 from DAILY_WEBHOOK_HMAC>" }
 * Store the returned (or supplied) hmac in DAILY_WEBHOOK_HMAC.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // Daily creation / reactivation probe — respond immediately.
  if (isDailyWebhookTestBody(rawBody)) {
    return NextResponse.json({ ok: true, test: true });
  }

  const hmacSecret = process.env.DAILY_WEBHOOK_HMAC?.trim() ?? "";
  if (!hmacSecret) {
    logDaily("webhook_hmac_missing", {});
    return NextResponse.json(
      { error: "Daily webhook HMAC not configured.", code: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const timestamp =
    request.headers.get("x-webhook-timestamp") ??
    request.headers.get("X-Webhook-Timestamp");
  const signature =
    request.headers.get("x-webhook-signature") ??
    request.headers.get("X-Webhook-Signature");

  if (
    !verifyDailyWebhookSignature({
      timestamp,
      signature,
      rawBody,
      hmacSecretBase64: hmacSecret,
    })
  ) {
    logDaily("webhook_bad_signature", {});
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Process after auth; keep handler fast. Await so serverless doesn't freeze mid-write.
  const result = await processDailyWebhookBody(parsed);
  return NextResponse.json(result);
}

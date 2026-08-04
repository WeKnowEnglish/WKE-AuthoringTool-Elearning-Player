import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Daily webhook HMAC verification.
 * Docs: timestamp + "." + raw JSON body, HMAC-SHA256 with base64-decoded secret,
 * digest base64 compared to X-Webhook-Signature.
 */
export function computeDailyWebhookSignature(input: {
  timestamp: string;
  rawBody: string;
  hmacSecretBase64: string;
}): string {
  const secret = Buffer.from(input.hmacSecretBase64, "base64");
  const payload = `${input.timestamp}.${input.rawBody}`;
  return createHmac("sha256", secret).update(payload).digest("base64");
}

export function verifyDailyWebhookSignature(input: {
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  hmacSecretBase64: string;
}): boolean {
  if (!input.timestamp || !input.signature || !input.hmacSecretBase64.trim()) {
    return false;
  }
  let expected: string;
  try {
    expected = computeDailyWebhookSignature({
      timestamp: input.timestamp,
      rawBody: input.rawBody,
      hmacSecretBase64: input.hmacSecretBase64,
    });
  } catch {
    return false;
  }

  const supplied = Buffer.from(input.signature);
  const expectedBuf = Buffer.from(expected);
  if (supplied.length !== expectedBuf.length) return false;
  return timingSafeEqual(supplied, expectedBuf);
}

export function isDailyWebhookTestBody(rawBody: string): boolean {
  try {
    const parsed = JSON.parse(rawBody) as { test?: unknown };
    return parsed?.test === "test";
  } catch {
    return false;
  }
}

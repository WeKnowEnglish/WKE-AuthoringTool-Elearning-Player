import { describe, expect, it } from "vitest";
import {
  dailyRoleFromWebhook,
  parseParticipantPayload,
  unixSecondsToIso,
} from "@/lib/daily/webhook-events";
import {
  computeDailyWebhookSignature,
  isDailyWebhookTestBody,
  verifyDailyWebhookSignature,
} from "@/lib/daily/webhook-verify";

describe("Daily webhook signature", () => {
  // 32 zero bytes → known base64 secret for tests
  const hmacSecretBase64 = Buffer.alloc(32, 7).toString("base64");

  it("verifies timestamp + raw body HMAC", () => {
    const rawBody = JSON.stringify({
      type: "participant.joined",
      id: "evt-1",
      payload: { room: "wke-d-abc", user_id: "u1", session_id: "s1" },
    });
    const nowMs = Date.parse("2026-07-30T12:00:00.000Z");
    const timestamp = String(Math.floor(nowMs / 1000));
    const signature = computeDailyWebhookSignature({
      timestamp,
      rawBody,
      hmacSecretBase64,
    });

    expect(
      verifyDailyWebhookSignature({
        timestamp,
        signature,
        rawBody,
        hmacSecretBase64,
        nowMs,
      }),
    ).toBe(true);

    expect(
      verifyDailyWebhookSignature({
        timestamp,
        signature: "tampered",
        rawBody,
        hmacSecretBase64,
        nowMs,
      }),
    ).toBe(false);

    expect(
      verifyDailyWebhookSignature({
        timestamp,
        signature,
        rawBody: rawBody.replace("u1", "u2"),
        hmacSecretBase64,
        nowMs,
      }),
    ).toBe(false);

    expect(
      verifyDailyWebhookSignature({
        timestamp,
        signature,
        rawBody,
        hmacSecretBase64,
        nowMs: nowMs + 10 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it("detects Daily endpoint test probe", () => {
    expect(isDailyWebhookTestBody('{"test":"test"}')).toBe(true);
    expect(isDailyWebhookTestBody('{"type":"participant.joined"}')).toBe(false);
  });
});

describe("Daily webhook participant parsing", () => {
  it("parses join payload and maps roles", () => {
    const parsed = parseParticipantPayload({
      room: "wke-d-abc",
      user_id: "guest-deadbeef",
      session_id: "daily-sess-1",
      owner: false,
      joined_at: 1708972279.96,
    });
    expect(parsed?.room).toBe("wke-d-abc");
    expect(dailyRoleFromWebhook({ owner: false, userId: "guest-deadbeef" })).toBe(
      "guest",
    );
    expect(dailyRoleFromWebhook({ owner: true, userId: "uuid" })).toBe("teacher");
    expect(
      dailyRoleFromWebhook({
        owner: false,
        userId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe("student");
  });

  it("rejects incomplete payloads", () => {
    expect(parseParticipantPayload({ room: "r" })).toBeNull();
  });

  it("converts unix seconds to ISO", () => {
    const iso = unixSecondsToIso(1_708_972_279);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(Date.parse(iso)).toBe(1_708_972_279_000);
  });
});

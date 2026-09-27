import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  TRAFFIC_ATTR_COOKIE,
  TRAFFIC_ATTR_PING_COOKIE,
  parseAttributionCookie,
  serializeAttribution,
  type TrafficAttribution,
} from "./attribution";
import { applyTrafficAttribution } from "./apply-attribution-cookie";

function documentRequest(url: string, headers?: HeadersInit) {
  return new NextRequest(url, {
    headers: {
      accept: "text/html",
      "sec-fetch-dest": "document",
      host: "weknowenglish.online",
      ...headers,
    },
  });
}

describe("applyTrafficAttribution", () => {
  it("sets a first-touch cookie from the referring site", () => {
    const request = documentRequest("https://weknowenglish.online/teach-english-online?utm_source=guide", {
      referer: "https://preply.com/en/tutor/1",
    });
    const response = applyTrafficAttribution(request, NextResponse.next());
    const stored = parseAttributionCookie(response.cookies.get(TRAFFIC_ATTR_COOKIE)?.value);
    expect(stored?.referrerHost).toBe("preply.com");
    expect(stored?.landingPath).toBe("/teach-english-online");
    expect(stored?.utmSource).toBe("guide");
    expect(response.cookies.get(TRAFFIC_ATTR_PING_COOKIE)?.value).toBe("1");
  });

  it("does not replace an existing arrival cookie", () => {
    const existing: TrafficAttribution = {
      visitorId: "22222222-2222-4222-8222-222222222222",
      landingPath: "/teach-english-online",
      referrerHost: "www.google.com",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      capturedAt: "2026-09-27T04:00:00.000Z",
    };
    const request = documentRequest("https://weknowenglish.online/login?portal=teacher", {
      referer: "https://weknowenglish.online/teach-english-online",
      cookie: `${TRAFFIC_ATTR_COOKIE}=${serializeAttribution(existing)}`,
    });
    const response = applyTrafficAttribution(request, NextResponse.next());
    expect(response.cookies.get(TRAFFIC_ATTR_COOKIE)).toBeUndefined();
  });

  it("skips router prefetches", () => {
    const request = documentRequest("https://weknowenglish.online/esl-activities-for-kids", {
      referer: "https://www.google.com/",
      "next-router-prefetch": "1",
    });
    const response = applyTrafficAttribution(request, NextResponse.next());
    expect(response.cookies.get(TRAFFIC_ATTR_COOKIE)).toBeUndefined();
  });
});

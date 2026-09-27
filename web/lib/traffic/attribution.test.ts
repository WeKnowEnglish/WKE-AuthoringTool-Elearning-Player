import { describe, expect, it } from "vitest";
import {
  buildAttribution,
  externalReferrerHost,
  firstTouchAttribution,
  formatTrafficSource,
  isDocumentNavigation,
  parseAttributionCookie,
  serializeAttribution,
  type ArrivalSignals,
} from "./attribution";

const capturedAt = "2026-09-27T04:00:00.000Z";
const visitorId = "11111111-1111-4111-8111-111111111111";

function signals(overrides: Partial<ArrivalSignals> = {}): ArrivalSignals {
  return {
    method: "GET",
    pathname: "/teach-english-online",
    searchParams: new URLSearchParams("utm_source=newsletter&utm_medium=email"),
    host: "weknowenglish.online",
    referer: "https://www.google.com/search?q=esl+activities",
    accept: "text/html",
    secFetchDest: "document",
    purpose: null,
    nextRouterPrefetch: null,
    rsc: null,
    ...overrides,
  };
}

describe("traffic attribution", () => {
  it("keeps the referring host and drops the search query", () => {
    expect(externalReferrerHost("https://www.google.com/search?q=secret", "weknowenglish.online")).toBe(
      "www.google.com",
    );
  });

  it("treats our own site, including www, as no external referrer", () => {
    expect(externalReferrerHost("https://weknowenglish.online/login", "weknowenglish.online")).toBeNull();
    expect(externalReferrerHost("https://www.weknowenglish.online/", "weknowenglish.online")).toBeNull();
  });

  it("records the first document and ignores prefetch or later pages", () => {
    const attr = buildAttribution(signals(), visitorId, capturedAt);
    expect(attr.referrerHost).toBe("www.google.com");
    expect(attr.landingPath).toBe("/teach-english-online");
    expect(attr.utmSource).toBe("newsletter");
    expect(attr.utmMedium).toBe("email");

    const cookie = serializeAttribution(attr);
    expect(parseAttributionCookie(cookie)).toMatchObject({
      visitorId,
      landingPath: "/teach-english-online",
      referrerHost: "www.google.com",
      utmSource: "newsletter",
    });
    expect(firstTouchAttribution(cookie, buildAttribution(signals({ pathname: "/login" }), visitorId, capturedAt))).toBe(
      null,
    );
    expect(isDocumentNavigation(signals({ nextRouterPrefetch: "1" }))).toBe(false);
    expect(isDocumentNavigation(signals({ rsc: "1", secFetchDest: null }))).toBe(false);
    expect(isDocumentNavigation(signals({ pathname: "/api/traffic/arrival", secFetchDest: null }))).toBe(false);
  });

  it("replaces a corrupt cookie and labels a direct visit", () => {
    const incoming = buildAttribution(signals({ referer: null, searchParams: new URLSearchParams() }), visitorId, capturedAt);
    expect(firstTouchAttribution("not-a-cookie", incoming)).toEqual(incoming);
    expect(formatTrafficSource({ referrerHost: null, landingPath: "/" })).toBe("direct · landed on /");
    expect(formatTrafficSource({ referrerHost: null, landingPath: null })).toBeNull();
  });
});

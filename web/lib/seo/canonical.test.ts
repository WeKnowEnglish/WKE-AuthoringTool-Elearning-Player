import { describe, expect, it } from "vitest";
import {
  canonicalUrl,
  isIndexableHost,
  isWwwHost,
  shouldSendPreviewNoindex,
} from "@/lib/seo/canonical";

describe("canonicalUrl", () => {
  it("uses the apex host for the homepage with no trailing slash", () => {
    expect(canonicalUrl("/")).toBe("https://weknowenglish.online");
    expect(canonicalUrl("")).toBe("https://weknowenglish.online");
  });

  it("strips trailing slashes from other paths", () => {
    expect(canonicalUrl("/grammar")).toBe("https://weknowenglish.online/grammar");
    expect(canonicalUrl("/grammar/")).toBe("https://weknowenglish.online/grammar");
    expect(canonicalUrl("grammar/foo/")).toBe(
      "https://weknowenglish.online/grammar/foo",
    );
  });
});

describe("host helpers", () => {
  it("recognizes the production apex host", () => {
    expect(isIndexableHost("weknowenglish.online")).toBe(true);
    expect(isIndexableHost("weknowenglish.online:443")).toBe(true);
    expect(isIndexableHost("www.weknowenglish.online")).toBe(false);
    expect(isIndexableHost("lesson-player.vercel.app")).toBe(false);
    expect(isIndexableHost("localhost")).toBe(false);
  });

  it("detects www for apex redirect", () => {
    expect(isWwwHost("www.weknowenglish.online")).toBe(true);
    expect(isWwwHost("weknowenglish.online")).toBe(false);
  });

  it("requires preview noindex outside production apex", () => {
    expect(shouldSendPreviewNoindex("weknowenglish.online", "production")).toBe(false);
    expect(shouldSendPreviewNoindex("lesson-player.vercel.app", "preview")).toBe(true);
    expect(shouldSendPreviewNoindex("localhost", undefined)).toBe(true);
    expect(shouldSendPreviewNoindex("weknowenglish.online", "preview")).toBe(true);
  });
});

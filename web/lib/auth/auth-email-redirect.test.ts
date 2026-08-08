import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authCallbackRedirectUrl,
  authEmailRedirectOrigin,
} from "@/lib/auth/auth-email-redirect";
import { SITE_URL } from "@/lib/seo/site";

describe("authEmailRedirectOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps localhost for local email testing", () => {
    expect(authEmailRedirectOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(authEmailRedirectOrigin("http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("does not use Vercel preview origins", () => {
    expect(
      authEmailRedirectOrigin(
        "https://wke-authroing-tool-elearning-player-dewb0pvp6-we-know-english.vercel.app",
      ),
    ).toBe(SITE_URL);
  });

  it("prefers NEXT_PUBLIC_APP_ORIGIN over SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://staging.example.com/");
    expect(
      authEmailRedirectOrigin("https://some-preview.vercel.app"),
    ).toBe("https://staging.example.com");
  });

  it("builds callback URLs with next path", () => {
    expect(authCallbackRedirectUrl("/parent", "https://preview.vercel.app")).toBe(
      `${SITE_URL}/auth/callback?next=${encodeURIComponent("/parent")}`,
    );
  });
});

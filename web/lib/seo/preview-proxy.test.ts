import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}));
vi.mock("@/lib/traffic/apply-attribution-cookie", () => ({
  applyTrafficAttribution: vi.fn((_request, response) => response),
}));

afterEach(() => vi.unstubAllEnvs());

describe("managed-host preview indexing", () => {
  it("marks a preview response noindex behind an internal host", async () => {
    vi.stubEnv("APP_ORIGIN", "https://preview.weknowenglish.online");
    vi.stubEnv("WKE_DEPLOYMENT_ENV", "");
    const response = await proxy(new NextRequest("http://localhost:3000/login", {
      headers: { host: "localhost:3000" },
    }));
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("keeps production indexable behind the same internal host", async () => {
    vi.stubEnv("APP_ORIGIN", "https://weknowenglish.online");
    vi.stubEnv("WKE_DEPLOYMENT_ENV", "production");
    const response = await proxy(new NextRequest("http://localhost:3000/", {
      headers: { host: "localhost:3000" },
    }));
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("honors an explicit preview environment with a production canonical origin", async () => {
    vi.stubEnv("APP_ORIGIN", "https://weknowenglish.online");
    vi.stubEnv("WKE_DEPLOYMENT_ENV", "preview");
    const response = await proxy(new NextRequest("https://weknowenglish.online/"));
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/runtime-config/route";

describe("GET /api/runtime-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes only the public Supabase browser configuration at runtime", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-secret");

    const response = await GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toContain('"supabaseUrl":"https://example.supabase.co"');
    expect(body).toContain('"supabaseAnonKey":"public-anon-key"');
    expect(body).not.toContain("server-secret");
  });
});

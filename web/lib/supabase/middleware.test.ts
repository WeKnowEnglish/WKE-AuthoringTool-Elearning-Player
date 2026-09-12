import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
let cookieAdapter:
  | {
      getAll: () => unknown[];
      setAll: (
        cookies: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>,
      ) => void;
    }
  | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: { cookies: typeof cookieAdapter },
    ) => {
      cookieAdapter = options.cookies;
      return { auth: { getUser } };
    },
  ),
}));

vi.mock("@/lib/env/supabase-server", () => ({
  getSupabaseServerEnv: () => ({
    url: "https://example.supabase.co",
    anonKey: "test-anon-key",
  }),
}));

import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { config as proxyConfig } from "../../proxy";

describe("updateSession", () => {
  beforeEach(() => {
    getUser.mockReset();
    cookieAdapter = undefined;
  });

  it("asks Supabase to validate or refresh the user on every matched request", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await updateSession(new NextRequest("https://wke.test/homework/homework-1"));

    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("copies refreshed session cookies onto the request and response", async () => {
    getUser.mockImplementation(async () => {
      cookieAdapter?.setAll([
        {
          name: "sb-refresh",
          value: "rotated-session",
          options: { httpOnly: true, sameSite: "lax", path: "/" },
        },
      ]);
      return { data: { user: { id: "student-1" } }, error: null };
    });
    const request = new NextRequest("https://wke.test/homework/homework-1");

    const response = await updateSession(request);

    expect(request.cookies.get("sb-refresh")?.value).toBe("rotated-session");
    expect(response.cookies.get("sb-refresh")?.value).toBe("rotated-session");
  });

  it("lets the downstream verifier classify a thrown temporary provider failure", async () => {
    getUser.mockRejectedValue(new Error("provider_internal_detail"));

    await expect(
      updateSession(new NextRequest("https://wke.test/homework/homework-1")),
    ).resolves.toBeDefined();
  });

  it("matches every homework route shape while excluding static assets", () => {
    const source = proxyConfig.matcher[0];
    expect(source).toBeTruthy();
    const matcher = new RegExp(`^${source}$`);

    for (const pathname of [
      "/homework/homework-1",
      "/primary/homework/homework-1",
      "/secondary/homework/homework-1",
      "/login",
    ]) {
      expect(matcher.test(pathname), pathname).toBe(true);
    }
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/images/homework.png")).toBe(false);
  });
});

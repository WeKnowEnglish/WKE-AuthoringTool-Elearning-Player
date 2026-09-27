// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserClientMock } = vi.hoisted(() => ({
  createBrowserClientMock: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

import { createClient } from "./client";

describe("browser Supabase client", () => {
  beforeEach(() => {
    createBrowserClientMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    window.__WKE_RUNTIME_CONFIG__ = {
      supabaseUrl: "https://runtime.supabase.co",
      supabaseAnonKey: "runtime-public-key",
    };
  });

  afterEach(() => {
    delete window.__WKE_RUNTIME_CONFIG__;
    vi.unstubAllEnvs();
  });

  it("uses runtime configuration when build-time public variables are absent", () => {
    createClient();

    expect(createBrowserClientMock).toHaveBeenCalledWith(
      "https://runtime.supabase.co",
      "runtime-public-key",
      expect.any(Object),
    );
  });
});

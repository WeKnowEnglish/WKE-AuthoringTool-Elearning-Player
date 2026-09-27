import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createServiceRoleSupabase: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
}));

vi.mock("@/lib/supabase/service-role-client", () => ({
  createServiceRoleSupabase: mocks.createServiceRoleSupabase,
}));

import { requireAdminContext } from "@/lib/admin/admin-context";

describe("administrator context", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.createServiceRoleSupabase.mockReset();
    mocks.createServiceRoleSupabase.mockReturnValue({ marker: "service" });
  });

  it.each([
    ["anonymous", null],
    ["student", { id: "student-1", email: "student@example.com", app_metadata: { role: "student" } }],
    ["teacher", { id: "teacher-1", email: "teacher@example.com", app_metadata: { role: "teacher" } }],
    ["parent-like account", { id: "parent-1", email: "parent@example.com", app_metadata: { role: "parent" } }],
  ])("denies %s access to cross-user diagnostics", async (_label, user) => {
    mocks.getUser.mockResolvedValue({ data: { user } });

    await expect(requireAdminContext()).resolves.toEqual({
      ok: false,
      error: "Admin access required.",
    });
    expect(mocks.createServiceRoleSupabase).not.toHaveBeenCalled();
  });

  it("allows a teacher with explicit administrator metadata", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          app_metadata: { role: "teacher", admin: true },
        },
      },
    });

    const result = await requireAdminContext();
    expect(result).toMatchObject({
      ok: true,
      ctx: { userId: "admin-1", email: "admin@example.com" },
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/service-role-client", () => ({
  createServiceRoleSupabase: () => ({ rpc }),
}));

import { GET, POST } from "@/app/api/cron/diagnostics-retention/route";

describe("diagnostics retention cron", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    rpc.mockReset();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (previousSecret == null) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });

  it("rejects requests without the configured bearer secret", async () => {
    const response = await GET(new Request("http://localhost/api/cron/diagnostics-retention"));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("runs the service-only prune function for authorized GET and POST calls", async () => {
    rpc.mockResolvedValue({ data: 4, error: null });
    const request = () =>
      new Request("http://localhost/api/cron/diagnostics-retention", {
        headers: { authorization: "Bearer test-cron-secret" },
      });
    const getResponse = await GET(request());
    const postResponse = await POST(request());
    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual({ ok: true, deleted: 4, retentionDays: 60 });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("prune_platform_usage_events");
  });
});

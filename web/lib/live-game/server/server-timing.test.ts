import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __liveGameServerTimingTestUtils,
  withLiveGameServerTiming,
} from "@/lib/live-game/server/server-timing";

describe("live-game server timing utility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a single Server-Timing header with total and stages", () => {
    const header = __liveGameServerTimingTestUtils.buildServerTimingHeader(
      "live_game_challenge",
      137.84,
      [
        { name: "auth", durationMs: 12.41 },
        { name: "supabase_rpc", durationMs: 84.22 },
        { name: "liveblocks_read", durationMs: 31.6 },
      ],
    );
    expect(header).toBe(
      "live_game_challenge;dur=137.8, total;dur=137.8, auth;dur=12.4, supabase_rpc;dur=84.2, liveblocks_read;dur=31.6",
    );
  });

  it("sanitizes metric names", () => {
    expect(__liveGameServerTimingTestUtils.safeMetric("liveblocks mutate!")).toBe("liveblocks_mutate_");
  });

  it("attaches Server-Timing and X-Server-Ms on success", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await withLiveGameServerTiming("live_game_position", async (timer) => {
      timer.setContext({ roomId: "wke-live-game-ABC123", role: "player" });
      await timer.measure("auth", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      await timer.measure("liveblocks_mutate", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      return NextResponse.json({ ok: true });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Server-Ms")).toMatch(/^\d+\.\d$/);
    const serverTiming = response.headers.get("Server-Timing") ?? "";
    expect(serverTiming).toContain("live_game_position;dur=");
    expect(serverTiming).toContain("total;dur=");
    expect(serverTiming).toContain("auth;dur=");
    expect(serverTiming).toContain("liveblocks_mutate;dur=");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain("Server-Timing");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain("X-Server-Ms");

    const body = await response.json();
    expect(body).toEqual({ ok: true });

    expect(info).toHaveBeenCalled();
    const log = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(log.type).toBe("live_game_server_timing");
    expect(log.route).toBe("live_game_position");
    expect(log.status).toBe(200);
    expect(log.roomId).toBe("wke-live-game-ABC123");
    expect(log.stages.auth).toBeGreaterThan(0);
    expect(log.stages.liveblocks_mutate).toBeGreaterThan(0);
  });

  it("attaches timing headers on expected error responses", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await withLiveGameServerTiming("live_game_classes", async (timer) => {
      await timer.measure("auth", async () => undefined);
      return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("X-Server-Ms")).toMatch(/^\d+\.\d$/);
    expect(response.headers.get("Server-Timing")).toContain("live_game_classes;dur=");
    expect(await response.json()).toEqual({ error: "Teacher login required." });
  });
});

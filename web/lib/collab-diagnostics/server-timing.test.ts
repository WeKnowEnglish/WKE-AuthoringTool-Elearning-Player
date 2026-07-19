import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __collabServerTimingTestUtils,
  withCollabServerTiming,
} from "@/lib/collab-diagnostics/server-timing";

describe("collab server timing utility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a single Server-Timing header with total and stages", () => {
    const header = __collabServerTimingTestUtils.buildServerTimingHeader(
      "whiteboard.submit",
      220.44,
      [
        { name: "auth", durationMs: 8.12 },
        { name: "mutateStorage", durationMs: 140.55 },
        { name: "enrichPreviews", durationMs: 60.21 },
      ],
    );
    expect(header).toBe(
      "whiteboard_submit;dur=220.4, total;dur=220.4, auth;dur=8.1, mutateStorage;dur=140.6, enrichPreviews;dur=60.2",
    );
  });

  it("sanitizes metric names", () => {
    expect(__collabServerTimingTestUtils.safeMetric("whiteboard.submit")).toBe(
      "whiteboard_submit",
    );
    expect(__collabServerTimingTestUtils.safeMetric("mutate storage!")).toBe(
      "mutate_storage_",
    );
  });

  it("attaches Server-Timing and X-Server-Ms on success", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await withCollabServerTiming("whiteboard.submit", async (timer) => {
      timer.setContext({
        activity: "whiteboard",
        sessionId: "ABC123",
        roomId: "wke-whiteboard-ABC123",
        role: "player",
        boardId: "board-1",
      });
      await timer.measure("auth", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      await timer.measure("mutateStorage", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
      return NextResponse.json({ ok: true });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Server-Ms")).toMatch(/^\d+\.\d$/);
    const serverTiming = response.headers.get("Server-Timing") ?? "";
    expect(serverTiming).toContain("whiteboard_submit;dur=");
    expect(serverTiming).toContain("total;dur=");
    expect(serverTiming).toContain("auth;dur=");
    expect(serverTiming).toContain("mutateStorage;dur=");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain("Server-Timing");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain("X-Server-Ms");

    const body = await response.json();
    expect(body).toEqual({ ok: true });

    expect(info).toHaveBeenCalled();
    const log = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(log.type).toBe("collab_server_timing");
    expect(log.route).toBe("whiteboard.submit");
    expect(log.status).toBe(200);
    expect(log.sessionId).toBe("ABC123");
    expect(log.boardId).toBe("board-1");
    expect(log.stages.auth).toBeGreaterThan(0);
    expect(log.stages.mutateStorage).toBeGreaterThan(0);
  });

  it("attaches timing headers on expected error responses", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await withCollabServerTiming("whiteboard.command", async (timer) => {
      await timer.measure("auth", async () => undefined);
      return NextResponse.json({ error: "Teacher only." }, { status: 403 });
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("X-Server-Ms")).toMatch(/^\d+\.\d$/);
    expect(response.headers.get("Server-Timing")).toContain("whiteboard_command;dur=");
    expect(await response.json()).toEqual({ error: "Teacher only." });
  });
});

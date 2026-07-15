import { describe, expect, it } from "vitest";
import {
  parseServerMsHeader,
  parseServerTimingHeader,
  resolveServerMs,
} from "@/lib/live-game/diagnostics/server-timing-parse";

describe("parseServerTimingHeader", () => {
  it("parses multiple metrics with decimal durations", () => {
    expect(
      parseServerTimingHeader(
        "live_game_position;dur=45.2, total;dur=45.2, auth;dur=12.4, liveblocks_mutate;dur=31.6",
      ),
    ).toEqual([
      { name: "live_game_position", durationMs: 45.2 },
      { name: "total", durationMs: 45.2 },
      { name: "auth", durationMs: 12.4 },
      { name: "liveblocks_mutate", durationMs: 31.6 },
    ]);
  });

  it("returns empty for missing header", () => {
    expect(parseServerTimingHeader(null)).toEqual([]);
    expect(parseServerTimingHeader(undefined)).toEqual([]);
    expect(parseServerTimingHeader("")).toEqual([]);
  });

  it("ignores malformed entries", () => {
    expect(parseServerTimingHeader("auth;dur=12.4, broken, liveblocks;dur=abc, total;dur=40")).toEqual([
      { name: "auth", durationMs: 12.4 },
      { name: "total", durationMs: 40 },
    ]);
  });

  it("keeps duplicate metric names", () => {
    const metrics = parseServerTimingHeader("auth;dur=10, auth;dur=20, total;dur=30");
    expect(metrics).toEqual([
      { name: "auth", durationMs: 10 },
      { name: "auth", durationMs: 20 },
      { name: "total", durationMs: 30 },
    ]);
  });
});

describe("parseServerMsHeader", () => {
  it("parses decimal X-Server-Ms", () => {
    expect(parseServerMsHeader("137.8")).toBe(137.8);
  });

  it("rejects invalid values", () => {
    expect(parseServerMsHeader(null)).toBeNull();
    expect(parseServerMsHeader("abc")).toBeNull();
    expect(parseServerMsHeader("-1")).toBeNull();
  });
});

describe("resolveServerMs", () => {
  it("prefers X-Server-Ms over Server-Timing", () => {
    expect(
      resolveServerMs("99.9", "total;dur=10, auth;dur=5"),
    ).toEqual({
      serverMs: 99.9,
      metrics: [
        { name: "total", durationMs: 10 },
        { name: "auth", durationMs: 5 },
      ],
    });
  });

  it("uses total metric when X-Server-Ms is absent", () => {
    expect(resolveServerMs(null, "auth;dur=12.4, total;dur=137.8")).toEqual({
      serverMs: 137.8,
      metrics: [
        { name: "auth", durationMs: 12.4 },
        { name: "total", durationMs: 137.8 },
      ],
    });
  });

  it("returns null when no timing headers are available", () => {
    expect(resolveServerMs(null, null)).toEqual({ serverMs: null, metrics: [] });
  });
});

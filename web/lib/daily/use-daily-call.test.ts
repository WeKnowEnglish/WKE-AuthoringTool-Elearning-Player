// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDailyCall } from "@/components/virtual-classroom/daily/useDailyCall";
import { dailyResumeKey } from "./recovery";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), createFrame: vi.fn() }));
vi.mock("@daily-co/daily-js", () => ({ default: { createFrame: mocks.createFrame } }));
vi.mock("@/lib/app-diagnostics/client", () => ({ diagnosticFetch: mocks.fetch, recordAppDiagnostic: vi.fn(), startAppDiagnosticSpan: () => vi.fn() }));
let hook: ReturnType<typeof useDailyCall>;
let root: Root;
let host: HTMLDivElement;
let ended = false;
let calls: ReturnType<typeof fakeCall>[];
function fakeCall() {
  let state = "new";
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const local = { local: true, audio: false, video: true, session_id: "provider-participant" };
  const emit = (event: string, value: unknown = {}) => { for (const handler of listeners.get(event) ?? []) handler(value); };
  const call = {
    on: (name: string, handler: (event: unknown) => void) => { listeners.set(name, [...(listeners.get(name) ?? []), handler]); },
    join: vi.fn(async () => { state = "joined-meeting"; emit("joined-meeting"); }),
    leave: vi.fn(async () => { state = "left-meeting"; emit("left-meeting"); }),
    destroy: vi.fn(async () => {}), setTheme: vi.fn(async () => {}),
    participants: () => ({ local }), meetingState: () => state,
    emit, local,
    failNetwork: () => { state = "error"; emit("error", { error: { type: "connection-error" }, errorMsg: "Offline" }); emit("left-meeting"); },
  };
  return call;
}
function Harness() {
  const value = useDailyCall({ sessionId: "vcs_TEST01", userId: "student-a", isHost: false, sessionEnded: ended });
  useLayoutEffect(() => { hook = value; }, [value]);
  return createElement("div", { ref: value.containerRef });
}
async function settle() { await act(async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); }); }
async function join() { await act(async () => { await hook.connect(); }); await settle(); }
beforeEach(async () => {
  vi.useFakeTimers(); vi.clearAllMocks(); sessionStorage.clear(); ended = false; calls = [];
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
  mocks.fetch.mockImplementation(async () => Response.json({ token: "test-only", roomUrl: "https://test.daily.co/room", exp: Math.floor(Date.now() / 1000) + 120 }));
  mocks.createFrame.mockImplementation(() => { const call = fakeCall(); calls.push(call); return call; });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(Harness)));
});
afterEach(async () => { await act(async () => root.unmount()); await settle(); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Daily connection recovery lifecycle", () => {
  it("refresh obtains a fresh token, skips the repeated lobby and preserves mute choices", async () => {
    await join();
    expect(hook.phase).toBe("joined");
    await act(async () => root.unmount()); await settle();
    root = createRoot(host); await act(async () => root.render(createElement(Harness)));
    await join();
    const [, request] = mocks.fetch.mock.calls.at(-1)!;
    expect(JSON.parse(request.body)).toEqual({ resume: true, audioOff: true, videoOff: false });
    expect(calls).toHaveLength(2);
  });
  it("does not leave or rejoin a working call at token expiry", async () => {
    await join(); await act(async () => vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000));
    expect(calls[0].leave).not.toHaveBeenCalled(); expect(mocks.fetch).toHaveBeenCalledOnce();
  });
  it("keeps the same call during a short provider interruption", async () => {
    await join();
    await act(async () => calls[0].emit("network-connection", { type: "signaling", event: "interrupted" }));
    expect(hook.reconnecting).toBe(true);
    await act(async () => calls[0].emit("network-connection", { type: "signaling", event: "connected" }));
    expect(hook.reconnecting).toBe(false); expect(calls[0].leave).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.fetch).toHaveBeenCalledOnce(); expect(calls[0].destroy).not.toHaveBeenCalled();
  });
  it("replaces a call stuck joined after prolonged signaling loss", async () => {
    await join();
    await act(async () => calls[0].emit("network-connection", { type: "signaling", event: "interrupted" }));
    await act(async () => vi.advanceTimersByTimeAsync(29_000));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(2000)); await settle();
    expect(calls[0].destroy).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledTimes(2); expect(hook.phase).toBe("joined"); expect(hook.reconnecting).toBe(false);
  });
  it("waits for online before replacing stale joined signaling", async () => {
    await join(); Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await act(async () => calls[0].emit("network-connection", { type: "signaling", event: "interrupted" }));
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await act(async () => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(1000)); await settle();
    expect(calls[0].destroy).toHaveBeenCalledOnce(); expect(hook.phase).toBe("joined");
  });
  it("does not restart a call for media quality interruptions alone", async () => {
    await join();
    await act(async () => calls[0].emit("network-connection", { type: "sfu", event: "interrupted" }));
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.fetch).toHaveBeenCalledOnce(); expect(calls[0].destroy).not.toHaveBeenCalled();
  });
  it("automatically recovers a fatal network drop once online", async () => {
    await join(); Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await act(async () => calls[0].failNetwork());
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await act(async () => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(1000)); await settle();
    expect(mocks.fetch).toHaveBeenCalledTimes(2); expect(hook.phase).toBe("joined");
  });
  it("backs off temporary token errors but stops on revoked access", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ error: "Temporary" }, { status: 503 }));
    await join(); expect(hook.reconnecting).toBe(true);
    mocks.fetch.mockResolvedValueOnce(Response.json({ error: "Removed", code: "not_authorized" }, { status: 403 }));
    await act(async () => vi.advanceTimersByTimeAsync(1000)); await settle();
    expect(hook.reconnecting).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(60_000)); expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["leave", "end", "ejected"])("does not auto-rejoin after %s", async reason => {
    await join();
    await act(async () => calls[0].emit("network-connection", { type: "signaling", event: "interrupted" }));
    if (reason === "leave") await act(async () => { await hook.leave(); });
    if (reason === "end") { ended = true; await act(async () => root.render(createElement(Harness))); }
    if (reason === "ejected") await act(async () => { calls[0].emit("error", { error: { type: "ejected" }, errorMsg: "Removed" }); calls[0].emit("left-meeting"); });
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(dailyResumeKey("vcs_TEST01", "student-a"))).toBeNull();
  });
  it("a late token response cannot resurrect an ended lesson", async () => {
    let resolve!: (response: Response) => void;
    mocks.fetch.mockReturnValueOnce(new Promise<Response>(done => { resolve = done; }));
    await act(async () => { void hook.connect(); });
    ended = true; await act(async () => root.render(createElement(Harness)));
    await act(async () => resolve(Response.json({ token: "late", roomUrl: "https://test.daily.co/room" })));
    await settle(); expect(mocks.createFrame).not.toHaveBeenCalled();
  });
});

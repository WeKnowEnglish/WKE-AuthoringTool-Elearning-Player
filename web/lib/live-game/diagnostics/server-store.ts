import type { LiveGameDiagnosticEvent } from "@/lib/live-game/diagnostics/types";

type DiagnosticGlobal = typeof globalThis & {
  __wkeLiveGameDiagnosticEvents?: LiveGameDiagnosticEvent[];
};

const diagnosticGlobal = globalThis as DiagnosticGlobal;
const MAX_EVENTS = 4000;
const MAX_AGE_MS = 30 * 60_000;

function store() {
  diagnosticGlobal.__wkeLiveGameDiagnosticEvents ??= [];
  return diagnosticGlobal.__wkeLiveGameDiagnosticEvents;
}

export function appendLiveGameDiagnosticEvents(events: LiveGameDiagnosticEvent[]) {
  const cutoff = Date.now() - MAX_AGE_MS;
  const unique = new Map<string, LiveGameDiagnosticEvent>();
  for (const event of [...store(), ...events]) {
    if (event.at >= cutoff) unique.set(`${event.deviceId}:${event.id}`, event);
  }
  diagnosticGlobal.__wkeLiveGameDiagnosticEvents = [...unique.values()].slice(-MAX_EVENTS);
}

export function readLiveGameDiagnosticEvents(roomId?: string) {
  const cutoff = Date.now() - MAX_AGE_MS;
  const events = store().filter((event) => event.at >= cutoff);
  diagnosticGlobal.__wkeLiveGameDiagnosticEvents = events;
  return roomId ? events.filter((event) => event.roomId === roomId) : events;
}

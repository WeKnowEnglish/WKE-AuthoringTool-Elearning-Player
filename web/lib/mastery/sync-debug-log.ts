export type MasterySyncDebugLevel = "info" | "warn" | "error";

export type MasterySyncDebugOp =
  | "pull"
  | "hydrate"
  | "evidence_push"
  | "mastery_upsert"
  | "queue_enqueue"
  | "queue_flush"
  | "debounce_flush"
  | "backlog";

export type MasterySyncDebugEvent = {
  at: string;
  level: MasterySyncDebugLevel;
  op: MasterySyncDebugOp;
  message: string;
  detail?: string;
};

export const MAX_SYNC_DEBUG_EVENTS = 30;

const events: MasterySyncDebugEvent[] = [];
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function appendSyncDebugEvent(
  event: Omit<MasterySyncDebugEvent, "at"> & { at?: string },
): MasterySyncDebugEvent {
  const entry: MasterySyncDebugEvent = {
    at: event.at ?? new Date().toISOString(),
    level: event.level,
    op: event.op,
    message: event.message,
    detail: event.detail,
  };
  events.unshift(entry);
  while (events.length > MAX_SYNC_DEBUG_EVENTS) {
    events.pop();
  }
  notifyListeners();
  return entry;
}

export function readSyncDebugEvents(): MasterySyncDebugEvent[] {
  return [...events];
}

export function subscribeSyncDebugEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: clear event log and listeners. */
export function resetSyncDebugLogForTests(): void {
  events.length = 0;
  listeners.clear();
}

import type { MasterySnapshot } from "@/lib/mastery/local-storage";

export type MasterySnapshotDiff = {
  onlyLocal: string[];
  onlyServer: string[];
  localNewer: string[];
  serverNewer: string[];
  inSync: string[];
};

function parseUpdatedAt(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Compare local vs server snapshots for the D1 debug panel (display only). */
export function diffMasterySnapshotsForDebug(
  local: MasterySnapshot,
  server: MasterySnapshot,
): MasterySnapshotDiff {
  const onlyLocal: string[] = [];
  const onlyServer: string[] = [];
  const localNewer: string[] = [];
  const serverNewer: string[] = [];
  const inSync: string[] = [];

  const localKeys = Object.keys(local.records);
  const serverKeys = new Set(Object.keys(server.records));

  for (const key of localKeys) {
    const localRecord = local.records[key];
    const serverRecord = server.records[key];
    if (!localRecord) continue;

    if (!serverRecord) {
      onlyLocal.push(key);
      continue;
    }

    const localTime = parseUpdatedAt(localRecord.updatedAt);
    const serverTime = parseUpdatedAt(serverRecord.updatedAt);
    if (localTime > serverTime) {
      localNewer.push(key);
    } else if (serverTime > localTime) {
      serverNewer.push(key);
    } else {
      inSync.push(key);
    }
  }

  for (const key of serverKeys) {
    if (!local.records[key]) {
      onlyServer.push(key);
    }
  }

  return { onlyLocal, onlyServer, localNewer, serverNewer, inSync };
}

import { describe, expect, it } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import type { MasterySnapshot } from "@/lib/mastery/local-storage";
import { diffMasterySnapshotsForDebug } from "@/lib/mastery/mastery-snapshot-diff";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

const studentId = "a1111111-1111-4111-8111-111111111111";

function wordRecord(key: string, updatedAt: string): StudentMasteryRecord {
  const record = createEmptyMasteryRecord({
    studentId,
    target: { type: "word", key, label: key },
  });
  record.updatedAt = updatedAt;
  return record;
}

function snap(records: Record<string, StudentMasteryRecord>): MasterySnapshot {
  return { schemaVersion: 1, updatedAt: "", records };
}

describe("diffMasterySnapshotsForDebug", () => {
  it("classifies only-local, only-server, and timestamp buckets", () => {
    const local = snap({
      "word:a": wordRecord("word:a", "2026-07-09T10:00:00.000Z"),
      "word:b": wordRecord("word:b", "2026-07-09T12:00:00.000Z"),
      "word:c": wordRecord("word:c", "2026-07-09T08:00:00.000Z"),
    });
    const server = snap({
      "word:b": wordRecord("word:b", "2026-07-09T11:00:00.000Z"),
      "word:c": wordRecord("word:c", "2026-07-09T08:00:00.000Z"),
      "word:d": wordRecord("word:d", "2026-07-09T09:00:00.000Z"),
    });

    const diff = diffMasterySnapshotsForDebug(local, server);

    expect(diff.onlyLocal).toEqual(["word:a"]);
    expect(diff.onlyServer).toEqual(["word:d"]);
    expect(diff.localNewer).toEqual(["word:b"]);
    expect(diff.serverNewer).toEqual([]);
    expect(diff.inSync).toEqual(["word:c"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  REQUIRED_JOURNEYS,
  analyzeSnapshot,
  assertMetadataOnlySql,
  validateRegistry,
} from "./database-architecture-audit-core.mjs";

const blankSnapshot = () => ({
  tables: [],
  functions: [],
  triggers: [],
  foreignKeys: [],
  indexes: [],
  policies: [],
  tableGrants: [],
  functionGrants: [],
});

function completeRegistry(overrides = {}) {
  return {
    version: 1,
    reviewedThroughMigration: "147",
    objects: REQUIRED_JOURNEYS.map((journey, index) => ({
      name: "public.object_" + index,
      kind: "table",
      journeys: [journey],
      owner: "Test owner",
      sensitivity: "test metadata",
      authority: "test authority",
      migration: "supabase/migrations/147_test.sql",
      relationships: [],
      access: "test access",
      usage: "confirmed",
      callSites: ["lib/test.ts"],
    })),
    ...overrides,
  };
}

describe("database architecture metadata query guard", () => {
  it("accepts a catalog-only select", () => {
    expect(() =>
      assertMetadataOnlySql(
        "with objects as (select * from pg_catalog.pg_class) select * from objects;",
      ),
    ).not.toThrow();
  });

  it("rejects mutation statements", () => {
    expect(() =>
      assertMetadataOnlySql("select 1; delete from public.student_profiles;"),
    ).toThrow(/metadata-only/i);
  });
});

describe("database architecture schema findings", () => {
  it("blocks browser-facing table grants when RLS is disabled", () => {
    const snapshot = blankSnapshot();
    snapshot.tables.push({
      schema: "public",
      name: "student_work",
      kind: "table",
      rlsEnabled: false,
    });
    snapshot.tableGrants.push({
      schema: "public",
      table: "student_work",
      role: "authenticated",
      privilege: "select",
    });

    expect(analyzeSnapshot(snapshot)).toContainEqual(
      expect.objectContaining({
        code: "client_grant_without_rls",
        blocking: true,
        subject: "public.student_work",
      }),
    );
  });

  it("accepts an RLS table with an applicable public policy", () => {
    const snapshot = blankSnapshot();
    snapshot.tables.push({
      schema: "public",
      name: "student_work",
      kind: "table",
      rlsEnabled: true,
    });
    snapshot.tableGrants.push({
      schema: "public",
      table: "student_work",
      role: "authenticated",
      privilege: "select",
    });
    snapshot.policies.push({
      schema: "public",
      table: "student_work",
      roles: ["public"],
      command: "SELECT",
    });

    expect(
      analyzeSnapshot(snapshot).filter(
        (finding) => finding.code.includes("grant") || finding.code.includes("rls"),
      ),
    ).toEqual([]);
  });

  it("reports a grant-policy mismatch as deny-by-default advisory", () => {
    const snapshot = blankSnapshot();
    snapshot.tables.push({
      schema: "public",
      name: "student_work",
      kind: "table",
      rlsEnabled: true,
    });
    snapshot.tableGrants.push({
      schema: "public",
      table: "student_work",
      role: "authenticated",
      privilege: "select",
    });

    expect(analyzeSnapshot(snapshot)).toContainEqual(
      expect.objectContaining({
        code: "grant_without_applicable_policy",
        blocking: false,
      }),
    );
  });

  it("reports foreign keys that lack a leading-column index", () => {
    const snapshot = blankSnapshot();
    snapshot.foreignKeys.push({
      schema: "public",
      table: "submissions",
      name: "submissions_student_id_fkey",
      columns: ["student_id"],
      references: "auth.users",
      validated: true,
    });
    snapshot.indexes.push({
      schema: "public",
      table: "submissions",
      name: "submissions_status_student_idx",
      columns: ["status", "student_id"],
      valid: true,
    });

    expect(analyzeSnapshot(snapshot)).toContainEqual(
      expect.objectContaining({
        code: "foreign_key_without_leading_index",
        blocking: false,
      }),
    );
  });

  it("accepts a valid index whose leading columns match a composite foreign key", () => {
    const snapshot = blankSnapshot();
    snapshot.foreignKeys.push({
      schema: "public",
      table: "submissions",
      name: "submissions_homework_student_fkey",
      columns: ["homework_id", "student_id"],
      references: "public.enrollments",
      validated: true,
    });
    snapshot.indexes.push({
      schema: "public",
      table: "submissions",
      name: "submissions_homework_student_status_idx",
      columns: ["homework_id", "student_id", "status"],
      valid: true,
    });

    expect(
      analyzeSnapshot(snapshot).filter(
        (finding) => finding.code === "foreign_key_without_leading_index",
      ),
    ).toEqual([]);
  });

  it("blocks client-executable security definer functions with mutable search_path", () => {
    const snapshot = blankSnapshot();
    snapshot.functions.push({
      schema: "public",
      name: "unsafe_student_rpc",
      securityDefiner: true,
      config: [],
    });
    snapshot.functionGrants.push({
      schema: "public",
      name: "unsafe_student_rpc",
      role: "authenticated",
      privilege: "execute",
    });

    expect(analyzeSnapshot(snapshot)).toContainEqual(
      expect.objectContaining({
        code: "client_executable_security_definer_without_search_path",
        blocking: true,
      }),
    );
  });
});

describe("learning-critical registry validation", () => {
  it("accepts complete coverage reviewed through the latest migration", () => {
    expect(
      validateRegistry(completeRegistry(), {
        latestMigration: "147",
        pathExists: () => true,
      }),
    ).toEqual([]);
  });

  it("fails when the migration review marker is stale", () => {
    expect(
      validateRegistry(completeRegistry(), {
        latestMigration: "148",
        pathExists: () => true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "registry_review_is_stale",
        blocking: true,
      }),
    );
  });

  it("fails when a required field or learning journey is omitted", () => {
    const registry = completeRegistry();
    registry.objects[0].owner = "";
    registry.objects = registry.objects.filter(
      (entry) => !entry.journeys.includes("classroom-recovery"),
    );
    const findings = validateRegistry(registry, {
      latestMigration: "147",
      pathExists: () => true,
    });
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "missing_registry_field", blocking: true }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "unmapped_required_journey", blocking: true }),
    );
  });

  it("keeps unknown usage advisory rather than authorizing cleanup", () => {
    const registry = completeRegistry();
    registry.objects[0].usage = "unknown";
    expect(
      validateRegistry(registry, {
        latestMigration: "147",
        pathExists: () => true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "usage_needs_verification",
        blocking: false,
      }),
    );
  });

  it("fails when a registered linked object is absent", () => {
    const registry = completeRegistry();
    const snapshot = blankSnapshot();
    snapshot.tables = registry.objects.slice(1).map((entry) => {
      const [schema, name] = entry.name.split(".");
      return { schema, name, kind: "table", rlsEnabled: true };
    });
    expect(
      validateRegistry(registry, {
        snapshot,
        latestMigration: "147",
        pathExists: () => true,
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "registered_object_missing",
        subject: registry.objects[0].name,
        blocking: true,
      }),
    );
  });
});

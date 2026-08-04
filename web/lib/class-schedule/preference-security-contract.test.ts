import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/113_class_schedule_preferences.sql"),
  "utf8",
);

describe("class schedule preferences migration contract", () => {
  it("adds preference collection flag and window/preference tables", () => {
    expect(migration).toContain("preference_collection_open");
    expect(migration).toContain("create table if not exists public.class_schedule_windows");
    expect(migration).toContain(
      "create table if not exists public.class_schedule_preferences",
    );
  });

  it("scopes guardian preference writes to open collection + active guardianship", () => {
    expect(migration).toContain("class_schedule_preferences_guardian_insert");
    expect(migration).toContain("tc.preference_collection_open = true");
    expect(migration).toContain("public.is_active_guardian(student_id)");
  });

  it("extends parent_linked_students with preference_collection_open", () => {
    expect(migration).toContain("drop function if exists public.parent_linked_students()");
    expect(migration).toContain("preference_collection_open boolean");
    expect(migration).toContain(
      "coalesce(current_class.preference_collection_open, false)",
    );
  });
});

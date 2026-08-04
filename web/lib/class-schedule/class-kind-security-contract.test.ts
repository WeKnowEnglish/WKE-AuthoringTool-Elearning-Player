import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/112_class_kind_and_guardian_schedule.sql"),
  "utf8",
);

describe("class kind + guardian schedule migration contract", () => {
  it("adds regular/trial class_kind on teacher_classes", () => {
    expect(migration).toContain("add column if not exists class_kind");
    expect(migration).toContain("check (class_kind in ('regular', 'trial'))");
  });

  it("bootstraps class_meeting_slots when 078 was skipped", () => {
    expect(migration).toContain(
      "create table if not exists public.class_meeting_slots",
    );
    expect(migration).toContain("class_meeting_slots_owner_select");
    expect(migration).toContain("class_meeting_slots_student_select");
  });

  it("lets active guardians read meeting slots for enrolled children", () => {
    expect(migration).toContain("class_meeting_slots_guardian_select");
    expect(migration).toContain("sg.guardian_user_id = auth.uid()");
    expect(migration).toContain("sg.status = 'active'");
    expect(migration).toMatch(/for select/i);
  });
});

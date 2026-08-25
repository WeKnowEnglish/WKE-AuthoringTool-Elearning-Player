import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/139_trial_onboarding_first_pass.sql"),
  "utf8",
);

describe("trial onboarding first-pass migration contract", () => {
  it("creates bounded recurring availability through a teacher-only RPC", () => {
    expect(migration).toContain("create table if not exists public.teacher_availability_series");
    expect(migration).toContain("create or replace function public.create_trial_availability_series");
    expect(migration).toContain("repeat_weeks between 1 and 16");
    expect(migration).toContain("not public.is_teacher()");
  });

  it("keeps pending booking edits parent-owned and atomic", () => {
    expect(migration).toContain("create or replace function public.update_pending_trial_booking");
    expect(migration).toContain("v_booking.guardian_user_id <> v_guardian");
    expect(migration).toContain("v_booking.status <> 'pending'");
    expect(migration).toContain("set status = 'open'");
    expect(migration).toContain("set status = 'held'");
  });

  it("protects student discovery writes behind an enrolled-student RPC", () => {
    expect(migration).toContain("alter table public.trial_student_discovery enable row level security");
    expect(migration).toContain("revoke insert, update, delete on public.trial_student_discovery");
    expect(migration).toContain("create or replace function public.save_my_trial_discovery");
    expect(migration).toContain("and student_id = v_student");
    expect(migration).toContain("and status = 'confirmed'");
  });

  it("bootstraps student class columns for older pilot databases", () => {
    expect(migration).toContain("add column if not exists student_tab_schedule_enabled");
    expect(migration).toContain("add column if not exists student_tab_noticeboard_enabled");
    expect(migration).toContain("add column if not exists student_tab_materials_enabled");
    expect(migration).toContain("add column if not exists class_kind");
  });
});

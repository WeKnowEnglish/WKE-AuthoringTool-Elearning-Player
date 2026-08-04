import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/114_trial_availability_bookings.sql"),
  "utf8",
);

describe("trial availability bookings migration contract", () => {
  it("creates availability, booking, and occurrence tables", () => {
    expect(migration).toContain("create table if not exists public.teacher_availability_slots");
    expect(migration).toContain("create table if not exists public.trial_booking_requests");
    expect(migration).toContain("create table if not exists public.trial_occurrences");
  });

  it("exposes request/confirm/decline RPCs for atomic booking flow", () => {
    expect(migration).toContain("create or replace function public.request_trial_booking");
    expect(migration).toContain("create or replace function public.confirm_trial_booking");
    expect(migration).toContain("create or replace function public.decline_trial_booking");
    expect(migration).toContain("class_kind");
    expect(migration).toContain("insert into public.class_enrollments");
  });

  it("lets guardians browse open future slots and own bookings", () => {
    expect(migration).toContain("teacher_availability_slots_guardian_open_select");
    expect(migration).toContain("public.is_active_guardian(student_id)");
    expect(migration).toContain("status = 'open'");
  });
});

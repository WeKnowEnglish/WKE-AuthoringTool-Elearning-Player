import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/115_prospect_trials_and_hardening.sql"),
  "utf8",
);

describe("prospect trials hardening migration contract", () => {
  it("enables prospect bookings and teacher discovery", () => {
    expect(migration).toContain("trials_enabled");
    expect(migration).toContain("alter column student_id drop not null");
    expect(migration).toContain("p_child_display_name");
    expect(migration).toContain("resolve_trial_teacher_by_handle");
  });

  it("routes booking mutations through RPCs only", () => {
    expect(migration).toContain("revoke insert, update, delete on public.trial_booking_requests");
    expect(migration).toContain("create or replace function public.cancel_trial_booking");
    expect(migration).toContain("teacher_availability_slots_open_authenticated_select");
  });
});

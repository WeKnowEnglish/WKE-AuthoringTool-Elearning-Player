import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/151_teacher_wall_trial_schedule.sql"),
  "utf8",
);

describe("classroom wall trial schedule migration", () => {
  it("adds an opt-in flag and a narrow public preview", () => {
    expect(migration).toContain("show_trial_times boolean not null default false");
    expect(migration).toContain("create or replace function public.list_public_trial_times(p_handle text)");
    expect(migration).toContain("s.status = 'open'");
    expect(migration).toContain("interval '14 days'");
    expect(migration).toContain("limit 8");
    expect(migration).not.toContain("s.id");
    expect(migration).not.toContain("s.note");
  });

  it("does not expose the preview to the public role by default", () => {
    expect(migration).toContain(
      "revoke all on function public.list_public_trial_times(text) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.list_public_trial_times(text) to anon, authenticated",
    );
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/155_secret_role_rounds.sql"),
  "utf8",
).toLowerCase();

describe("Secret Roles database privacy contract", () => {
  it("keeps every private table behind service-role routes", () => {
    for (const table of [
      "secret_role_rounds",
      "secret_role_cards",
      "secret_role_assignments",
      "secret_role_responses",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from public, anon, authenticated`);
      expect(migration).toContain(`grant all on public.${table} to service_role`);
    }
  });

  it("limits the atomic launch function to the service role", () => {
    expect(migration).toContain(
      "revoke all on function public.create_secret_role_round(jsonb, jsonb, jsonb) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.create_secret_role_round(jsonb, jsonb, jsonb) to service_role",
    );
  });
});

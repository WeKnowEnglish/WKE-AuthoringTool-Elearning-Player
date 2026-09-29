import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/153_teacher_communications.sql"),
  "utf8",
);

describe("teacher communications security contract", () => {
  it("keeps admin email history inaccessible to browser roles", () => {
    expect(migration).toContain("alter table public.admin_email_sends enable row level security");
    expect(migration).toContain("revoke all on public.admin_email_sends from anon, authenticated");
    expect(migration).not.toMatch(/grant .*admin_email_sends.*authenticated/i);
  });

  it("limits message reads and writes to conversation members", () => {
    expect(migration).toContain("public.teacher_is_conversation_member(conversation_id)");
    expect(migration).toContain("sender_id = auth.uid()");
    expect(migration).toContain("public.teacher_is_conversation_member(id)");
  });

  it("does not let clients insert conversations or mutate membership rows", () => {
    expect(migration).toContain("grant select on public.teacher_conversations to authenticated");
    expect(migration).toContain("grant select on public.teacher_conversation_members to authenticated");
    expect(migration).not.toMatch(/grant .*insert.*teacher_conversations.*authenticated/i);
    expect(migration).not.toMatch(/grant .*update.*teacher_conversation_members.*authenticated/i);
  });

  it("keeps student and parent accounts outside the messaging system", () => {
    expect(migration).toContain(
      "if v_current_user_id is null or not public.is_teacher_communication_user()",
    );
    expect(migration).toMatch(
      /public\.is_teacher_communication_user\(\)\s+and sender_id = auth\.uid\(\)/,
    );
  });
});

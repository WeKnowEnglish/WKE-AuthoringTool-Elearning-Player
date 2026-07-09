# QA: P1a Supabase mastery schema + RLS

> **Superseded for program sign-off by** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md). **Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)

**Track:** P1a — schema only (no app wire)  
**Migration:** `supabase/migrations/024_student_mastery.sql`  
**Proposal:** [PROPOSAL_P1A_SUPABASE_SCHEMA.md](./PROPOSAL_P1A_SUPABASE_SCHEMA.md)

Run after applying `024_student_mastery.sql` to a dev Supabase project. Use two student test accounts (register via student `/login`).

---

## Automated (local)

| # | Check | Command / file | Result |
| --- | --- | --- | --- |
| A1 | Mapper unit tests pass | `npx vitest run lib/mastery/supabase-rows.test.ts` | ☐ Pass |
| A2 | Existing mastery tests unaffected | `npx vitest run lib/mastery/` | ☐ Pass |

---

## Migration apply

| # | Step | Result |
| --- | --- | --- |
| M1 | Run `024_student_mastery.sql` in SQL Editor | ☐ |
| M2 | `student_mastery_records` exists with unique `(student_id, target_key)` | ☐ |
| M3 | `student_learning_evidence` exists with unique `(student_id, id)` | ☐ |
| M4 | RLS enabled on both tables | ☐ |

---

## RLS manual checklist

| # | Action | Role | Expected | Result |
| --- | --- | --- | --- | --- |
| 1 | Select mastery rows | anon | Permission denied / no grant | ☐ |
| 2 | Insert row `student_id = User A` | User A JWT | Success | ☐ |
| 3 | Insert row `student_id = User B` | User A JWT | RLS violation | ☐ |
| 4 | Select all mastery rows | User A JWT | Only User A rows | ☐ |
| 5 | Update User B mastery row | User A JWT | Denied / 0 rows | ☐ |
| 6 | Delete own mastery row | User A JWT | Denied (no delete grant) | ☐ |
| 7 | Duplicate `(student_id, target_key)` insert | User A JWT | Unique violation | ☐ |
| 8 | Duplicate evidence `id` insert | User A JWT | Unique violation | ☐ |
| 9 | Update evidence row | User A JWT | Denied (no update policy) | ☐ |
| 10 | Select User A rows | service_role | Success | ☐ |

**Dev tip:** After student login in the browser, use Supabase client from DevTools or Table Editor with the authenticated session to exercise rows 2–9.

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Cross-account read/write, anon write access, evidence UPDATE allowed, student DELETE allowed.

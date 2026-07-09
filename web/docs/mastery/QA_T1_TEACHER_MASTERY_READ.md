# QA: T1 Teacher mastery read layer

**Track:** T1 — server reads (no UI)  
**Proposal:** [PROPOSAL_T1_TEACHER_MASTERY_READS.md](./PROPOSAL_T1_TEACHER_MASTERY_READS.md)  
**Prerequisite:** T0 migration `026` · P1 migrations `024` + `025`

Run after migration `027_teacher_mastery_read.sql` is applied.

---

## Schema & RLS

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | `027` applied | `student_mastery_records_teacher_select_enrolled` policy exists | ☐ |
| 2 | `teacher_can_read_student` updated | Archived-class enrollments still readable | ☐ |

---

## Access control (manual — Supabase SQL editor or API as teacher JWT)

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 3 | Teacher A selects mastery for enrolled student S | Rows returned | ☐ |
| 4 | Teacher B selects mastery for student S (not in B's classes) | Zero rows | ☐ |
| 5 | Student S selects own mastery | Rows returned (unchanged P1) | ☐ |
| 6 | Student S selects another student's mastery | Denied | ☐ |

---

## Application layer (after code ships)

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 7 | `npx vitest run lib/mastery/teacher-mastery-summary.test.ts` | Pass | ☐ |
| 8 | `npx vitest run lib/mastery/teacher-queries.test.ts` | Pass | ☐ |
| 9 | `getStudentMasteryDiagnostic` for enrolled student with known weak words | `weakWords` / `dueReview` match `classifyWordForPractice` | ☐ |
| 10 | `getClassMasteryOverview` for class with N students | N previews, correct counts | ☐ |
| 11 | Diagnostic for student with zero server rows | Empty diagnostic, not error | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product | | | ☐ N/A |

**Fail criteria:** Teacher reads non-enrolled student; student reads other student; classification diverges from `recommendations.ts` for same records.

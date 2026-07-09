# QA: P7B Teacher sentence review + mastery emit

**Track:** P7B — teacher approve / needs revision → server mastery write  
**Proposal:** [PROPOSAL_P7B_TEACHER_SENTENCE_REVIEW.md](./PROPOSAL_P7B_TEACHER_SENTENCE_REVIEW.md)  
**Prerequisites:** P7A ✅ · migrations `029_student_sentence_submissions.sql` + `030_teacher_sentence_review.sql` applied · T1/T2 teacher hub ✅

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Teacher sentence assessment | `npx vitest run lib/mastery/teacher-sentence-assessment.test.ts` | ☐ Pass |
| A2 | Secondary regression | `npx vitest run lib/secondary/` | ☐ Pass |
| A3 | Mastery regression | `npx vitest run lib/mastery/` | ☐ Pass |

---

## Teacher — class roster

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Sign in as teacher; open a class with enrolled students | Class page loads | ☐ |
| 2 | Student submits sentence(s) from Secondary → Sentence | — | ☐ |
| 3 | Refresh class page | Header shows **N sentences waiting for review** | ☐ |
| 4 | Roster **Writing** column | Amber badge `N pending` for that student only | ☐ |
| 5 | Click pending badge | Opens student diagnostic with **Writing** tab active | ☐ |
| 6 | Student not on roster / other class | No cross-class pending counts | ☐ |

---

## Teacher — Writing tab review

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 7 | Open student diagnostic → **Writing** tab | Table: word, sentence, submitted, status, actions | ☐ |
| 8 | Default filter **Pending** | Only `submitted` rows | ☐ |
| 9 | **Approve** a submission | Row → Approved; actions disabled | ☐ |
| 10 | Supabase: `student_sentence_submissions` | `status=approved`, `reviewed_at` set, `evidence_id` set | ☐ |
| 11 | Supabase: `student_learning_evidence` | Row with `activityId=secondary:sentence`, `source=teacher_assigned`, `evidenceMode=production` | ☐ |
| 12 | Supabase: `student_mastery_records` | Word target updated for that student | ☐ |
| 13 | **Request revision** with comment | `status=needs_revision`, `teacher_comment` saved; **no** mastery rows | ☐ |
| 14 | Approve same row again | Idempotent `{ ok: true, alreadyReviewed }` | ☐ |

---

## Student — read-only status

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 15 | After submit, open Sentence activity complete view | Each word: **Waiting for teacher review** | ☐ |
| 16 | After teacher approves; student refreshes / reopens activity | **Approved by teacher** | ☐ |
| 17 | After needs revision | **Needs revision** + teacher comment; copy mentions resubmit coming soon | ☐ |
| 18 | No resubmit button in P7B | Student cannot submit again for same word today | ☐ (superseded by P7C) |

---

## Cross-device mastery

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 19 | Teacher approves on device A | Server mastery updated | ☐ |
| 20 | Student signs in on device B (or pull on login) | Mastery reflects approval after P1b pull | ☐ |

---

## Security / scope

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 21 | Teacher not enrolled for student | Cannot SELECT submission via UI; RPC rejects | ☐ |
| 22 | Student cannot call `record_teacher_sentence_assessment` | RPC requires `is_teacher()` | ☐ |
| 23 | Approve without evidence payload | RPC error | ☐ |

---

## Out of scope (P7B — resubmit shipped in P7C)

- ~~Resubmit loop~~ → P7C ✅
- Assignment management / bulk assign
- Teacher arbitrary mastery editing
- Dismiss / archive submissions

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Mastery changes on submit, teacher sees other classes’ submissions, approve without evidence write, student can self-approve.

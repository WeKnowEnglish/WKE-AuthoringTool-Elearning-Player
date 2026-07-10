# QA: P7 Secondary sentence production (E2E)

**Track:** P7A + P7B + P7C — student submit → teacher review → resubmit → mastery  
**Proposals:** [PROPOSAL_P7_SECONDARY_SENTENCE_PRODUCTION.md](./PROPOSAL_P7_SECONDARY_SENTENCE_PRODUCTION.md) · [PROPOSAL_P7B_TEACHER_SENTENCE_REVIEW.md](./PROPOSAL_P7B_TEACHER_SENTENCE_REVIEW.md)  
**Prerequisites:** migrations `029`, `030`, `031` applied · logged-in enrolled student · teacher class

---

## Automated (local)

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Sentence submission helpers | `npx vitest run lib/secondary/secondary-sentence-submissions.test.ts` | ☐ Pass |
| A2 | Sentence quality checks | `npx vitest run lib/secondary/secondary-sentence-quality-check.test.ts` | ☐ Pass |
| A3 | Teacher sentence assessment | `npx vitest run lib/mastery/teacher-sentence-assessment.test.ts` | ☐ Pass |
| A4 | Secondary regression | `npx vitest run lib/secondary/` | ☐ Pass |

---

## P7A — Student submit

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Open `/secondary/sentence` | Prompts for eligible words in today's set | ☐ |
| 2 | Submit sentence for one word | Row in `student_sentence_submissions`, `status=submitted` | ☐ |
| 3 | Complete all words | Home chip: sent for review; **no** mastery change | ☐ |
| 4 | Guest user | Cannot submit (sign-in message) | ☐ |

---

## P7B — Teacher review

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 5 | Class roster | Pending sentence badge for student | ☐ |
| 6 | Writing tab → Approve | `approved` + evidence + mastery upsert | ☐ |
| 7 | Writing tab → Request revision + comment | `needs_revision`, no mastery | ☐ |
| 8 | Student complete view | Status + teacher comment visible | ☐ |

---

## P7C — Resubmit loop

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 9 | Student sees **Try again** on needs_revision word | Inline revision form opens | ☐ |
| 10 | Send revised sentence | New row `status=submitted`, `supersedes_id` set | ☐ |
| 11 | Prior row | `status=superseded` | ☐ |
| 12 | Teacher Writing tab (Pending) | New submission appears | ☐ |
| 13 | Teacher approves revision | Mastery updates (same as first approve) | ☐ |
| 14 | Cancel resubmit | Form closes; no DB change | ☐ |
| 15 | Resubmit while already `submitted` pending | Server rejects duplicate | ☐ |

---

## P7D — Quality checks

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 18 | Submit without target word | Blocked with friendly message | ☐ |
| 19 | Submit without capital / punctuation | Blocked with specific hint | ☐ |
| 20 | Submit too short (`"Brave."`) | Blocked — try a full sentence | ☐ |
| 21 | Valid sentence | Submits normally | ☐ |
| 22 | Resubmit path | Same rules apply | ☐ |
| 23 | Hint under textarea | Mentions not a grammar checker | ☐ |

---

## Regression

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 16 | Match / Cloze / Spelling / Learn | Unchanged | ☐ |
| 17 | P1 mastery pull after approve | Student sees updated mastery on reload | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Mastery on submit, resubmit without superseding prior row, teacher sees other class submissions, student can approve own work.

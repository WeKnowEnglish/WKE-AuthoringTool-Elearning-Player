# QA: T2 Teacher student diagnostic UI

**Track:** T2 — teacher UI  
**Proposal:** [PROPOSAL_T2_TEACHER_DIAGNOSTIC_UI.md](./PROPOSAL_T2_TEACHER_DIAGNOSTIC_UI.md)  
**Prerequisites:** T0 `026` · T1 `027` · enrolled student with mastery data

---

## Class roster

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | Open `/teacher/classes/[id]` with enrolled students | Due/weak pills visible | ☐ |
| 2 | Click student name or “View progress” | Navigates to student diagnostic | ☐ |
| 3 | Student with 0 mastery | Shows 0 due / 0 weak, link still works | ☐ |

---

## Student diagnostic — Overview

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 4 | KPI cards | Match T1 diagnostic counts | ☐ |
| 5 | Strand mini cards | 4 strands with rubric labels | ☐ |
| 6 | State distribution | Reflects `countsByState` | ☐ |
| 7 | Narrative | Plain-language summary, not empty for active student | ☐ |
| 8 | New student (0 records) | Friendly empty state | ☐ |

---

## Vocabulary tab

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 9 | Weak filter | Lowest-score words, lemmas shown | ☐ |
| 10 | Due filter | Words with due_review signal | ☐ |
| 11 | Unknown word id | Falls back to id, no crash | ☐ |

---

## Grammar & Skills tabs (T2b)

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 12 | Grammar tab | Lists grammar weak targets or empty state | ☐ |
| 13 | Skills tab | 4 strand cards with next-move hints | ☐ |

---

## Security

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 14 | URL with student not on roster | 404 | ☐ |
| 15 | Teacher B opens Teacher A's student URL | 404 or empty denied | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product | | | ☐ Pass / ☐ N/A |

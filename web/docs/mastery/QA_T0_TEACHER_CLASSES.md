# QA: T0 Teacher classes & roster

**Track:** T0 — class foundation  
**Proposal:** [PROPOSAL_T0_TEACHER_CLASSES.md](./PROPOSAL_T0_TEACHER_CLASSES.md)

Run after migration `026_teacher_classes.sql` is applied.

---

## Schema

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 1 | `026` applied | `teacher_classes`, `class_enrollments` exist | ☐ |
| 2 | Functions exist | `is_student`, `teacher_can_read_student`, `join_class_by_code` | ☐ |

---

## Teacher flows

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 3 | Create class at `/teacher/classes/new` | Class row + join code shown | ☐ |
| 4 | Classes tab in teacher nav | `/teacher/classes` lists class | ☐ |
| 5 | Class detail | Code copyable; roster empty | ☐ |
| 6 | Regenerate code | Old code invalid; new code works | ☐ |
| 7 | Archive class | Join blocked; roster still visible | ☐ |

---

## Student flows

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 8 | `/join-class` as guest | Redirect to login | ☐ |
| 9 | Join valid code | Success; enrollment row | ☐ |
| 10 | Join same code again | Idempotent (no error) | ☐ |
| 11 | Second student joins | Teacher roster shows both | ☐ |
| 12 | Invalid code | Friendly error | ☐ |

---

## Security

| # | Step | Expected | Result |
| --- | --- | --- | --- |
| 13 | Teacher B cannot see Teacher A class | Denied | ☐ |
| 14 | Teacher cannot read non-enrolled `student_profiles` | Denied | ☐ |
| 15 | Student cannot SELECT `teacher_classes` | Denied | ☐ |
| 16 | Teacher removes student | Enrollment gone from roster | ☐ |

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Cross-teacher data leak; student joins without auth; teacher sees unrelated student profiles.

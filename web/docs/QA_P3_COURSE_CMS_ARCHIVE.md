# QA: P3 — Course CMS archive

**Status:** Draft (run after P3 implementation)  
**Proposal:** [PROPOSAL_P3_COURSE_CMS_ARCHIVE.md](./PROPOSAL_P3_COURSE_CMS_ARCHIVE.md)  
**Prepared:** 2026-07-09

---

## Preconditions

- P2A–P2C merged (activity library, AI, QuizBuilder archived)
- T0–T2 migrations applied (`026`, `027`, `028`)
- Dev server running with test teacher + student accounts

---

## 1. Teacher portal re-home (P3A)

| # | Step | Expected |
| --- | --- | --- |
| 1.1 | Log in as teacher (no `next` param) | Lands on `/teacher/classes` |
| 1.2 | Visit `/teacher` | Classes-oriented home (not course wall) |
| 1.3 | Check top tabs | **Classes** and **Media Library** only; no Course Generator |
| 1.4 | Header brand link | Goes to `/teacher/classes` |

---

## 2. Teacher CMS archived (P3B)

| # | Step | Expected |
| --- | --- | --- |
| 2.1 | Visit `/teacher/courses` | 404 |
| 2.2 | Visit `/teacher/courses/new` | 404 |
| 2.3 | Visit a known old course workspace URL | 404 |
| 2.4 | Visit a known old lesson editor URL | 404 |
| 2.5 | Create class | No course dropdown |
| 2.6 | Open existing class detail | No linked-course display |
| 2.7 | `/teacher/media` | Still works (list/upload) |
| 2.8 | Class roster + student diagnostic (T2) | Still works |

---

## 3. Student hub preserved

| # | Step | Expected |
| --- | --- | --- |
| 3.1 | Visit `/learn` | Redirects to `/home?room=learn` |
| 3.2 | Learn room top level | Vocab category cards visible |
| 3.3 | Open a vocab set | Overlay → lesson plays → completes → returns |
| 3.4 | Grammar card/link from Learn room | Opens `/grammar` or grammar overlay |
| 3.5 | Secondary card | Navigates to secondary portal |
| 3.6 | `/home` other rooms (Pet, Quests, etc.) | Unchanged |

---

## 4. Student catalog archived (P3C)

| # | Step | Expected |
| --- | --- | --- |
| 4.1 | Visit `/learn/course/any-slug` | 404 |
| 4.2 | Visit a known old lesson deep link `/learn/module/lesson` | 404 |
| 4.3 | Student nav “Learn” or “Lessons” | Still opens hub Learn room (not 404) |

---

## 5. Mastery & secondary

| # | Step | Expected |
| --- | --- | --- |
| 5.1 | Complete primary vocab lesson | Mastery evidence still records (if debug enabled) |
| 5.2 | Complete secondary vocab quiz | Session + bridge unchanged |
| 5.3 | Student login pull sync (P1) | No new errors in console |

---

## 6. Automated

```bash
cd web && npm test
```

All tests pass (note any pre-existing flaky tests separately).

---

## 7. Sign-off

| Role | Name | Date | Pass? |
| --- | --- | --- | --- |
| Implementer | | | |
| Product | | | |

**Notes / exceptions:**

---

*End of QA checklist.*

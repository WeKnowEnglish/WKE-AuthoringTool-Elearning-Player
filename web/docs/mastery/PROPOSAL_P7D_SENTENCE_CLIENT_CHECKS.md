# Proposal: P7D — Sentence quality checks (client + server)

**Status:** Implemented (2026-07-10)  
**Track:** P7 Secondary production lane — final polish  
**Depends on:** P7A ✅ · P7B ✅ · P7C ✅  
**Parent:** [PROPOSAL_P7_SECONDARY_SENTENCE_PRODUCTION.md](./PROPOSAL_P7_SECONDARY_SENTENCE_PRODUCTION.md)

---

## Summary

Light guardrails before submit/resubmit reduce low-effort sentences in the teacher queue. **Not** grammar checking.

## Rules (R1–R5)

| Rule | Check |
| --- | --- |
| R1 | Non-empty, max 500 chars |
| R2 | Target `word` or `lemma` present (whole-word, case-insensitive) |
| R3 | Min 8 characters |
| R4 | Starts with capital letter |
| R5 | Ends with `.` `?` or `!` |

## Files

| File | Role |
| --- | --- |
| `lib/secondary/secondary-sentence-quality-check.ts` | Pure validator |
| `lib/actions/student-sentence.ts` | Server mirror on submit + resubmit |
| `components/secondary/SentenceActivity.tsx` | Client validate + hint copy |

## Out of scope

Grammar engine, spell-check, inflection matching (`bravery` for `brave`), teacher-side blocking.

# Live Game — Documentation Index

**Product:** Live Game — disposable classroom sessions  
**First mode:** English Craft  
**Status:** Phase 2 complete · Phase 3A–3F ✅ · Phase 4A–4F ✅ · 4G partial ✅ (2026-07-12)

---

## Documents

| Doc | Purpose |
| --- | --- |
| [product-framing.md](./product-framing.md) | Product identity, English Craft mode, session mantra |
| [phase-2-plan.md](./phase-2-plan.md) | Phase 2 implementation plan (v0.1 win loop) ✅ |
| [phase-3a-plan.md](./phase-3a-plan.md) | Phase 3A — question bank, art, map scaffold ✅ |
| [phase-3b-plan.md](./phase-3b-plan.md) | Phase 3B — carry & pool schema ✅ |
| [phase-3c-plan.md](./phase-3c-plan.md) | Phase 3C — harvest → carry ✅ |
| [phase-3d-plan.md](./phase-3d-plan.md) | Phase 3D — deposit + spell → pool ✅ |
| [phase-3e-plan.md](./phase-3e-plan.md) | Phase 3E — HUD + storage fill ✅ |
| [phase-3f-plan.md](./phase-3f-plan.md) | Phase 3F — multi-resource craft + victory ✅ |
| [phase-4-plan.md](./phase-4-plan.md) | Phase 4 overview — bench milestones, hunger, boat escape |
| [phase-4a-plan.md](./phase-4a-plan.md) | Phase 4A — map, schema, hammer/boat art ✅ |
| [phase-4b-plan.md](./phase-4b-plan.md) | Phase 4B — build bench + recipe engine ✅ |
| [phase-4c-plan.md](./phase-4c-plan.md) | Phase 4C — hammer + boat recipes ✅ |
| [phase-4d-plan.md](./phase-4d-plan.md) | Phase 4D — hunger + bread ✅ |
| [phase-4e-plan.md](./phase-4e-plan.md) | Phase 4E — boat boarding win ✅ |
| [phase-4f-plan.md](./phase-4f-plan.md) | Phase 4F — cleanup & pilot polish ✅ |
| [question-database-plan.md](./question-database-plan.md) | Question DB + host carousel + editor (approved) |
| [question-database-q1-plan.md](./question-database-q1-plan.md) | Phase Q1 — schema + seed + resolver ✅ |
| [question-database-q2-plan.md](./question-database-q2-plan.md) | Phase Q2 — wire runtime to DB ✅ |
| [question-database-q3-plan.md](./question-database-q3-plan.md) | Phase Q3 — host carousel ✅ |
| [question-database-q4-plan.md](./question-database-q4-plan.md) | Phase Q4 — editor + CRUD ✅ |
| [question-database-q5-plan.md](./question-database-q5-plan.md) | Phase Q5 — remove TS registry ✅ |
| [existing-system-audit.md](./existing-system-audit.md) | What exists in the repo; reuse verdicts |
| [architecture.md](./architecture.md) | State ownership, Liveblocks contract, API routes |
| [mvp-scope.md](./mvp-scope.md) | MVP includes/excludes, acceptance tests, pilot script |
| [liveblocks-limits.md](./liveblocks-limits.md) | Plan tier vs class size |

## Routes

| Route | Purpose |
| --- | --- |
| `/live-game` | Entry |
| `/live-game/host` | Teacher creates English Craft session |
| `/live-game/question-sets/[id]/edit` | Teacher edits a draft question set |
| `/live-game/join` | Student joins with code |
| `/live-game/[sessionId]` | Lobby + play |

**Local dev:** Live Game requires Supabase migrations **035–038** applied. Question content is DB-only (no TS registry fallback since Q5).

## Milestone map

| Phase | Delivers |
| --- | --- |
| 0 / 0.5 | Audit + product framing docs |
| **1** | **Session shell + multiplayer movement** ✅ |
| **2 / v0.1** | **Wood + MC + craft bridge + flag** ✅ |
| **3A** | **Adjectives bank + full art + map scaffold** ✅ |
| **3B** | **Carry & four-resource pool schema + spread map layout** ✅ |
| **3C** | **Harvest → carry** (all node types) ✅ |
| **3D** | **Deposit + spell → pool** ✅ |
| **3E** | **Four-resource HUD + storage fill sprites** ✅ |
| **3F** | **Multi-resource craft + victory stats** ✅ |
| **4** | **Bench milestones + hunger + boat escape** — [phase-4-plan.md](./phase-4-plan.md) |
| **4A** | **Island map + schema + hammer/boat art** ✅ |
| **4B** | **Build bench + recipe engine** — [phase-4b-plan.md](./phase-4b-plan.md) ✅ |
| **4C** | **Hammer + boat recipes** — [phase-4c-plan.md](./phase-4c-plan.md) ✅ |
| **4G** | **Deposit letter tiles** ✅ · **carry scale (48px / 24px)** ✅ |
| **4D** | **Hunger + bread** — [phase-4d-plan.md](./phase-4d-plan.md) ✅ |
| **4E** | **Boat boarding win** — [phase-4e-plan.md](./phase-4e-plan.md) ✅ |
| **4F** | **Cleanup & pilot polish** — [phase-4f-plan.md](./phase-4f-plan.md) ✅ |

## Deployment prerequisite

Apply `supabase/migrations/033_live_game_challenges.sql` before deploying the durable
challenge API. The API intentionally fails closed when the service-role key or table is
missing; it no longer falls back to process memory because that loses challenges across
cold starts and multiple server instances.
| 4 / v0.3 | Coins + shop + power-ups |
| 5 / v1.0 | Teacher wizard + timer + results |
| 6 / v1.1 | Vocab bank + mastery evidence |

## Code layout

```
web/lib/live-game/           — engine, modes, liveblocks
web/components/live-game/    — UI
web/app/live-game/           — routes
web/lib/liveblocks/          — shared room prefix + auth parser
```

## Phase 1 manual test

1. Set `LIVEBLOCKS_SECRET_KEY` in `.env.local`
2. `/live-game/host` — create room
3. Two `/live-game/join` tabs (logged-in students) — same code
4. Teacher starts — both move, see each other
5. Dev debug panel shows Presence coords + remote count

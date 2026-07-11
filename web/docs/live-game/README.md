# Live Game — Documentation Index

**Product:** Live Game — disposable classroom sessions  
**First mode:** English Craft  
**Status:** Phase 1 complete · Phase 2 plan ready (2026-07-11)

---

## Documents

| Doc | Purpose |
| --- | --- |
| [product-framing.md](./product-framing.md) | Product identity, English Craft mode, session mantra |
| [phase-2-plan.md](./phase-2-plan.md) | **Phase 2 implementation plan** (v0.1 win loop, assets, sub-milestones) |
| [existing-system-audit.md](./existing-system-audit.md) | What exists in the repo; reuse verdicts |
| [architecture.md](./architecture.md) | State ownership, Liveblocks contract, API routes |
| [mvp-scope.md](./mvp-scope.md) | MVP includes/excludes, acceptance tests, pilot script |
| [liveblocks-limits.md](./liveblocks-limits.md) | Plan tier vs class size |

## Routes

| Route | Purpose |
| --- | --- |
| `/live-game` | Entry |
| `/live-game/host` | Teacher creates English Craft session |
| `/live-game/join` | Student joins with code |
| `/live-game/[sessionId]` | Lobby + play |

## Milestone map

| Phase | Delivers |
| --- | --- |
| 0 / 0.5 | Audit + product framing docs |
| **1** | **Session shell + multiplayer movement** ✅ |
| **2 / v0.1** | **Wood + MC + craft bridge + flag** — [phase-2-plan.md](./phase-2-plan.md) |
| 3 / v0.2 | Stone + grammar questions |
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

# Live Game — Product Framing

**Status:** Locked (2026-07-11)  
**Product name:** Live Game  
**First mode:** English Craft

---

## What Live Game is

Live Game is a **disposable classroom session** product — like Gimkit, Kahoot, or Jackbox — except students play **inside a shared 2D world** instead of staring at a quiz-only screen.

```
Teacher creates session
        ↓
Students join with code
        ↓
Everyone plays together (15–30 min)
        ↓
Results summary
        ↓
Session ends — all game state disappears
```

**Not an MMO.** No persistent overworld, RPG progression, cross-session inventory, or quests.

---

## What English Craft is

**English Craft** is the first game mode built on the Live Game framework.

Cooperative loop (v0.1):

```
Cut trees → vocab MC question → +1 wood to team pool
        ↓
Collect enough wood (10 for pilot)
        ↓
Crafting bench → sentence ordering → craft bridge
        ↓
Cross river → touch flag → victory
```

Learning is the **interaction mechanic**, not the framing. Students think "I'm collecting wood," not "I'm doing a vocabulary activity."

---

## Three layers inside Live Game

| Layer | Responsibility |
| --- | --- |
| **SessionManager** | Host/join code, lobby, timer, start/pause/end, results |
| **MultiplayerEngine** | Liveblocks auth, Presence movement, remote players, reconnect |
| **GameModes** | Mode config: map, nodes, recipes, win condition, question bank |

English Craft config: [`web/lib/live-game/modes/english-craft/`](../../lib/live-game/modes/english-craft/)

Future modes (Escape Island, Treasure Hunt, etc.) reuse SessionManager + Engine with a new mode config package.

---

## Persistence rules

| Data | Lifetime |
| --- | --- |
| Player positions, pool, nodes, coins, unlocks | **Ephemeral** — Liveblocks room; dies when session ends |
| Learning evidence, session summary | **Persistent** — Supabase (Phase 2+ evidence, Phase 5+ results) |

---

## Development mantra

> Build one great 20-minute classroom game first.
>
> Build the session framework, the multiplayer foundation, and one polished English Craft experience that teachers would run every Friday. Once that loop is genuinely engaging, every future mode reuses the same session lifecycle, networking, question delivery, and results pipeline.

---

## Revised milestone map

| Milestone | Delivers |
| --- | --- |
| Phase 0 / 0.5 | Audit + product framing docs |
| Phase 1 | Session shell + multiplayer movement |
| Phase 2 / v0.1 | Wood + MC + craft bridge + flag — **no coins** |
| Phase 3 / v0.2 | Stone nodes + grammar questions |
| Phase 4 / v0.3 | Coins + shop + power-ups |
| Phase 5 / v1.0 | Teacher wizard + timer + results dashboard |
| Phase 6 / v1.1 | Vocab bank picker + mastery evidence |

**Key ordering change:** Coins come **after** the cooperative win loop is fun (Phase 4), not before crafting.

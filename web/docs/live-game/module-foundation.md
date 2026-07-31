# Live Game Module Foundation

**Status:** First two-game vertical slice implemented 2026-07-29

The live-game system is evolving through three boundaries:

1. **Platform** — rooms, identity, session lifecycle, questions, evidence, and reports.
2. **Shared runtime** — movement, maps, collision, remote players, and proven reusable mechanics.
3. **Game modules** — typed state, rules, server commands, rendering, and game-specific reporting.

## Current contract

`lib/live-game/modes/registry.ts` is the client-safe module registry. A module currently declares only:

- identity and version;
- availability status;
- teacher-facing metadata and defaults;
- its maps.

Server lifecycle hooks live in `lib/live-game/modes/server-registry.ts` so the client registry cannot import server mutation code.

English Craft and Bug Market are both launchable through the host flow. Bug Market supplies typed mode storage, its own lobby and meadow renderer, shared movement/collision, a server-authoritative catch command, and a question-gated sale command with action receipts. Inventory and coins live in room storage, so the display case and earnings survive reconnection.

Bug Market movement is shared through room presence, so connected students see one another in the same authoritative meadow. Development builds also expose `/pilots/bug-market`: a two-student in-memory adapter for testing movement, shared bug contention, sales, offline action queues, and reconnect replay without authentication, Liveblocks, or API calls.

## Next vertical slice

The next Bug Market vertical slice should supply:

- one currency and upgrade path;
- reporting mappings and a browser-level reconnection test.

Reusable runtime modules should be extracted only when English Craft and Bug Market demonstrate the same requirement.

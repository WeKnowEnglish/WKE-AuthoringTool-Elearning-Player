<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project goals

Before creating, decomposing, implementing, reviewing, or updating a project goal, read `docs/CODEX_MASTER_GOALS.md`. It is the platform-wide goal guide. `docs/lesson-player-master-document.md` remains the narrower product and planning source of truth for the student lesson-player experience, and the repository remains the source of truth for the current implementation.

## Bundle analysis

Run `npm run analyze` from this directory. It sets `ANALYZE=true` and runs `next build`, then opens browser reports for client and server bundles (use after dependency or code-splitting changes).

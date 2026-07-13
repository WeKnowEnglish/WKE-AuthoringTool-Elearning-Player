# Live Game Reporting V2

Reporting V2 replaces the single-winner/victory summary with learning evidence for every round.

## Stakeholder outcomes

- Students see only their own question review, independent and supported completions, practice needs, and game contributions.
- Teachers see an alphabetical, non-ranked class view with learning-target patterns, student evidence, team contributions, and questions that may need review.
- Guests receive an in-round report without requiring a permanent student account.
- Future parent and administrator reporting can link authenticated participants through `account_user_id` without exposing guest evidence.

## Evidence lifecycle

1. Starting a round creates a `live_game_report_rounds` record and snapshots the question-set metadata and participants.
2. Issuing a harvest, deposit, or craft challenge records the exact question shown and its learning context.
3. Each submission records a client UUID, answer, correctness, response time, and any resource or craft contribution awarded.
4. Skips and unfinished encounters are retained as evidence rather than silently discarded.
5. Objective completion, timeout, or an early host ending finalizes the round before the report is served.
6. Returning to the lobby resets gameplay only after the completed report state has been shown.

## Privacy and ranking

Detailed report tables are server-only with RLS enabled and no `anon` or `authenticated` table grants. The report endpoint validates the signed room/player cookie. A player response is filtered to that player; a host response contains the class diagnostic view. The product does not calculate or display a winner or student rank.

## Deployment order

1. Apply `supabase/migrations/041_live_game_reporting_v2.sql`.
2. Deploy the application code.
3. Smoke-test one objective-completed round, one timed round, and one host-ended round with both an authenticated player and a guest.

The application fails closed if the reporting tables or service-role configuration are unavailable, so the migration must precede the application deployment.

## Timer additions

English Craft supports 1, 2, 5, 10, 15, 20, and 30 minute rounds. During a timed round, the host can click the clock to add one minute. The server computes the new deadline from the later of the existing deadline or server time, preventing a stale client clock from shortening the round.

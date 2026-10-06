# Vercel retirement

Students and teachers need continuous learning access. Administrators need one
clear deployment workflow and no redundant provider connections.

## Verified on 2026-10-06

- Production and www DNS/HTTP responses identify Hostinger.
- Production, preview, and deployment-dashboard health endpoints report healthy
  processes and exact Git commits.
- The public production gate passed with no failures or warnings.
- GitHub maintenance and deployment-control workflows have successful runs.
- The Vercel CLI disconnected `WeKnowEnglish/WKE-AuthoringTool-Elearning-Player`
  from `wke-authoring-tool-elearning-player` in team `we-know-english`.
- No Vercel deploy hooks were configured.

## Repository retirement

Builds always produce standalone Node.js output. Release metadata, preview
noindex, diagnostics, and classroom gates use host-independent settings.
`web/vercel.json` and the unused default Vercel logo are removed. Historical
incident records may still mention old URLs; those are evidence, not dependencies.
Next.js's transitive file-tracing package does not require a Vercel account.

Classroom clock, retention, and video cleanup run through GitHub Actions.
The upcoming email outbox has an explicitly enabled GitHub job. Releasing the
unfinished communications feature is separate from infrastructure retirement.

## Account closure checklist

1. Verify the old project has no Git connection.
2. Compare required feature environment key names with Hostinger production.
   Keep any needed secret backup in private credential storage, never Git.
3. Check team billing, Marketplace installations, and registered domains.
   Preserve Supabase database/auth/storage and independent provider accounts.
4. Remove Vercel's GitHub access to this repository if no intended deployment
   still uses it. Preserve any installation serving unrelated repositories.
5. Pause or delete the old project after preserving needed settings. Permanent
   project/account deletion requires confirmation at the point of deletion.
6. Cancel any paid Vercel plan/add-ons after resources are independent.
7. Remove local `.vercel` links and revoke obsolete Vercel-only credentials.

Future rollback uses Hostinger build history, not Vercel or DNS reversal.
See [HOSTINGER.md](./HOSTINGER.md).

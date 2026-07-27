# ESL Mini-Series — teacher lesson plans

Teacher-facing Word documents for online ESL classes. **Not** Lesson Player screen JSON.

## Contents

- **6 packs** (A1 and A2), **12 mini-series** total
- Each series: **3 × 50-minute** online lessons with objectives, exit tickets, and a final student product
- Source files live under `packs/{pack-slug}/*.docx`

## Public surface

- Linked from [`/teach-english-online`](/teach-english-online) via `LessonPlanDownloadGate`
- Email required → signed download token (7 days) → ZIP or individual `.docx`
- API:
  - `POST /api/resources/mini-series/request` — `{ email }` → `{ token }`
  - `GET /api/resources/mini-series/download?token=…&resource=…`

### Resource IDs

| `resource` | Download |
|------------|----------|
| `library` | All 12 lessons (ZIP) |
| `pack:{pack-slug}` | One pack (2 lessons, ZIP) |
| `lesson:{lesson-slug}` | Single `.docx` |

## Leads

Inserts into `resource_download_leads` when `SUPABASE_SERVICE_ROLE_KEY` is set (migration `077_resource_download_leads.sql`).

Set `RESOURCE_DOWNLOAD_SECRET` in production for signed download tokens.

## Manifest

Catalog: [`web/lib/lesson-plans/mini-series-manifest.ts`](../../lib/lesson-plans/mini-series-manifest.ts)

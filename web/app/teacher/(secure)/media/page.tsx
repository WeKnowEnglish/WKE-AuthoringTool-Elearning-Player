import Link from "next/link";
import { redirect } from "next/navigation";
import { MediaAssetGrid } from "@/components/teacher/media/MediaAssetGrid";
import { MediaBulkUploadCard } from "@/components/teacher/media/MediaBulkUploadCard";
import { MediaLexiconMatchQueuePanel } from "@/components/teacher/media/MediaLexiconMatchQueuePanel";
import { MediaMetadataCsvImport } from "@/components/teacher/media/MediaMetadataCsvImport";
import {
  applyTeacherMediaMetadataCsv,
  bulkDeleteTeacherMedia,
  deleteTeacherMedia,
  inspectTeacherMediaBulkDuplicates,
  searchTeacherMedia,
  updateTeacherMediaMetadataFromForm,
  uploadTeacherMediaSingleFromForm,
  type MediaDuplicateIssue,
  type MediaLibraryScope,
  type MediaMetadataCsvImportResult,
  type UploadTeacherMediaBulkItemResult,
} from "@/lib/actions/media";
import { listPendingMediaLexiconMatches } from "@/lib/actions/media-lexicon-match";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | FormDataEntryValue | undefined | null): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v[0] ?? "";
  if (typeof v !== "string") return "";
  return v ?? "";
}

function csvToList(v: string): string[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildSearchUrl(values: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v.trim()) sp.set(k, v.trim());
  }
  const qs = sp.toString();
  return qs ? `/teacher/media?${qs}` : "/teacher/media";
}

function parseLibraryScope(raw: string): MediaLibraryScope {
  return raw.trim().toLowerCase() === "mine" ? "mine" : "school";
}

const MEDIA_PAGE_SIZE = 48;

function parseMediaPage(raw: string): number {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export default async function TeacherMediaPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const q = firstParam(params.q);
  const kind = firstParam(params.kind) || "all";
  const level = firstParam(params.level);
  const wordType = firstParam(params.word_type);
  const countability = firstParam(params.countability) || "all";
  const tags = firstParam(params.tags);
  const categories = firstParam(params.categories);
  const skills = firstParam(params.skills);
  const view = firstParam(params.view) || "icons_medium";
  const status = firstParam(params.status);
  const message = firstParam(params.message);
  const scope = parseLibraryScope(firstParam(params.scope));
  const pageNum = parseMediaPage(firstParam(params.page));
  /** Persist shelf + filters across pagination / actions (omit default school). */
  const scopeQs = scope === "mine" ? "mine" : "";

  const { rows: assets, total } = await searchTeacherMedia({
    q,
    kind: kind as "all" | "image" | "audio",
    level,
    wordType,
    countability: countability as "all" | "countable" | "uncountable" | "both" | "na",
    tags: csvToList(tags),
    categories: csvToList(categories),
    skills: csvToList(skills),
    scope,
    limit: MEDIA_PAGE_SIZE,
    offset: (pageNum - 1) * MEDIA_PAGE_SIZE,
  });

  const matchQueue = await listPendingMediaLexiconMatches(24);

  const totalPages = Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE));
  const pageQs = pageNum > 1 ? String(pageNum) : "";
  const filterBase = {
    q,
    kind,
    level,
    word_type: wordType,
    countability,
    tags,
    categories,
    skills,
    view,
    scope: scopeQs,
  };
  if (total > 0 && pageNum > totalPages) {
    redirect(
      buildSearchUrl({
        ...filterBase,
        page: String(totalPages),
      }),
    );
  }

  async function uploadSingleMediaAction(formData: FormData): Promise<UploadTeacherMediaBulkItemResult> {
    "use server";
    return uploadTeacherMediaSingleFromForm(formData);
  }

  async function saveMetadataAction(formData: FormData) {
    "use server";
    await updateTeacherMediaMetadataFromForm(formData);
  }

  async function inspectDuplicatesAction(formData: FormData): Promise<MediaDuplicateIssue[]> {
    "use server";
    return inspectTeacherMediaBulkDuplicates(formData);
  }

  async function deleteAssetAction(formData: FormData) {
    "use server";
    const id = firstParam(formData.get("id"));
    if (!id) return;
    const base = {
      q,
      kind,
      level,
      word_type: wordType,
      countability,
      tags,
      categories,
      skills,
      view,
      scope: scopeQs,
    };
    let targetUrl = "";

    try {
      await deleteTeacherMedia(id);
      targetUrl = buildSearchUrl({
        ...base,
        status: "deleted",
        message: "Asset deleted.",
      });
    } catch (e) {
      targetUrl = buildSearchUrl({
        ...base,
        status: "error",
        message: e instanceof Error ? e.message : "Delete failed",
      });
    }
    redirect(targetUrl);
  }

  async function bulkDeleteAssetsAction(ids: string[]) {
    "use server";
    const base = {
      q,
      kind,
      level,
      word_type: wordType,
      countability,
      tags,
      categories,
      skills,
      view,
      scope: scopeQs,
      page: pageQs,
    };
    let targetUrl = "";

    try {
      const result = await bulkDeleteTeacherMedia(ids);
      if (result.deleted === 0) {
        targetUrl = buildSearchUrl({
          ...base,
          status: "error",
          message: result.errors[0] ?? "No assets were deleted.",
        });
      } else if (result.errors.length > 0) {
        targetUrl = buildSearchUrl({
          ...base,
          status: "partial_upload",
          message: `Deleted ${result.deleted} asset(s). ${result.errors.length} failed.`,
        });
      } else {
        targetUrl = buildSearchUrl({
          ...base,
          status: "deleted",
          message: `Deleted ${result.deleted} asset(s).`,
        });
      }
    } catch (e) {
      targetUrl = buildSearchUrl({
        ...base,
        status: "error",
        message: e instanceof Error ? e.message : "Bulk delete failed",
      });
    }
    redirect(targetUrl);
  }

  async function importMediaMetadataCsvAction(
    _prev: MediaMetadataCsvImportResult,
    formData: FormData,
  ): Promise<MediaMetadataCsvImportResult> {
    "use server";
    return applyTeacherMediaMetadataCsv(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Asset Library</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {scope === "mine" ?
              "Your uploads — edit metadata and delete here. School library still includes these for everyone."
            : "Find trusted images and audio for lessons, stories, games, and vocabulary practice."}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <MediaMetadataCsvImport importAction={importMediaMetadataCsvAction} />
          <Link href="/teacher/classes" className="text-sm text-blue-700 underline">
            Go to Classes
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-sky-200 bg-sky-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-sky-950">Browse the collection</h2>
            <p className="mt-1 max-w-2xl text-xs text-sky-900/80">
              Start broad, then narrow by learning purpose. AI-generated items are labeled so teachers can review them
              before placing them in student activities.
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-900 shadow-sm">
            {total} matching asset{total === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick asset filters">
          {[
            { label: "All assets", value: "" },
            { label: "AI generated", value: "ai-generated" },
            { label: "School life starter", value: "school-life-starter-2026-08" },
            { label: "Vocabulary objects", value: "vocabulary-object" },
            { label: "Characters", value: "character" },
            { label: "Scenes", value: "scene" },
          ].map((collection) => {
            const active = tags.trim().toLowerCase() === collection.value;
            return (
              <Link
                key={collection.label}
                href={buildSearchUrl({ ...filterBase, tags: collection.value, page: "" })}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ?
                    "border-sky-800 bg-sky-800 text-white"
                  : "border-sky-200 bg-white text-sky-900 hover:border-sky-400"
                }`}
              >
                {collection.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div
        className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-1"
        role="tablist"
        aria-label="Library shelf"
      >
        <Link
          href={buildSearchUrl({ ...filterBase, scope: "", page: "" })}
          role="tab"
          aria-selected={scope === "school"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            scope === "school" ?
              "bg-neutral-900 text-white"
            : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          School library
        </Link>
        <Link
          href={buildSearchUrl({ ...filterBase, scope: "mine", page: "" })}
          role="tab"
          aria-selected={scope === "mine"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            scope === "mine" ?
              "bg-neutral-900 text-white"
            : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          My uploads
        </Link>
      </div>

      {status && message ? (
        <p
          className={`rounded border px-3 py-2 text-sm ${
            status === "error" ?
              "border-red-300 bg-red-50 text-red-800"
            : status === "partial_upload" ?
              "border-amber-300 bg-amber-50 text-amber-900"
            : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </p>
      ) : null}

      <MediaBulkUploadCard
        inspectDuplicatesAction={inspectDuplicatesAction}
        uploadSingleAction={uploadSingleMediaAction}
      />

      <MediaLexiconMatchQueuePanel rows={matchQueue.rows} total={matchQueue.total} />

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold text-neutral-900">Search and filters</h2>
        <form method="get" action="/teacher/media" className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {scope === "mine" ? <input type="hidden" name="scope" value="mine" /> : null}
          <label className="text-sm">
            Search assets
            <input
              name="q"
              defaultValue={q}
              placeholder="name, topic, action, or tag..."
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Kind
            <select name="kind" defaultValue={kind} className="mt-1 block w-full rounded border px-2 py-1 text-sm">
              <option value="all">All</option>
              <option value="image">Images</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <label className="text-sm">
            Level
            <input
              name="level"
              defaultValue={level}
              placeholder="A1, A2, B1..."
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Word type
            <input
              name="word_type"
              defaultValue={wordType}
              placeholder="noun, verb..."
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Countability
            <select
              name="countability"
              defaultValue={countability}
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="countable">Countable</option>
              <option value="uncountable">Uncountable</option>
              <option value="both">Both</option>
              <option value="na">N/A</option>
            </select>
          </label>
          <label className="text-sm">
            Tags (csv)
            <input
              name="tags"
              defaultValue={tags}
              placeholder="animals, food"
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Categories (csv)
            <input
              name="categories"
              defaultValue={categories}
              placeholder="vocabulary, grammar"
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Skills (csv)
            <input
              name="skills"
              defaultValue={skills}
              placeholder="listening, speaking"
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            Layout
            <select
              name="view"
              defaultValue={view}
              className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            >
              <option value="list">List</option>
              <option value="icons_small">Icons small</option>
              <option value="icons_medium">Icons medium</option>
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Apply
            </button>
            <Link
              href={scope === "mine" ? "/teacher/media?scope=mine" : "/teacher/media"}
              className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">
            {scope === "mine" ? "My uploads" : "Assets"} (
            {total === 0 ?
              "0"
            : `${(pageNum - 1) * MEDIA_PAGE_SIZE + 1}–${(pageNum - 1) * MEDIA_PAGE_SIZE + assets.length} of ${total}`}
            )
          </h2>
          <div className="flex items-center gap-1">
            <Link
              href={buildSearchUrl({
                ...filterBase,
                view: "list",
                page: pageQs,
              })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                view === "list" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
              }`}
            >
              List
            </Link>
            <Link
              href={buildSearchUrl({
                ...filterBase,
                view: "icons_small",
                page: pageQs,
              })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                view === "icons_small" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
              }`}
            >
              Icons small
            </Link>
            <Link
              href={buildSearchUrl({
                ...filterBase,
                view: "icons_medium",
                page: pageQs,
              })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                view === "icons_medium" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
              }`}
            >
              Icons medium
            </Link>
          </div>
        </div>
        {assets.length === 0 ? (
          <p className="rounded border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            {scope === "mine" ?
              q || kind !== "all" || level || wordType || tags || categories || skills ?
                "No uploads matched your search in My uploads."
              : "You haven’t uploaded any media yet. Use the upload card above — new files show up here and in the School library."
            : "No media matched your search."}
          </p>
        ) : (
          <MediaAssetGrid
            assets={assets}
            view={view}
            saveMetadataAction={saveMetadataAction}
            deleteSingleAction={deleteAssetAction}
            bulkDeleteAction={bulkDeleteAssetsAction}
          />
        )}
        {total > MEDIA_PAGE_SIZE ? (
          <nav
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-3 py-2 text-sm"
            aria-label="Pagination"
          >
            <span className="text-neutral-600">
              Page {pageNum} of {totalPages}
            </span>
            <div className="flex flex-wrap gap-2">
              {pageNum > 1 ? (
                <Link
                  href={buildSearchUrl({
                    ...filterBase,
                    page: pageNum - 1 > 1 ? String(pageNum - 1) : "",
                  })}
                  className="rounded border border-neutral-300 px-3 py-1.5 font-semibold hover:bg-neutral-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded border border-neutral-100 px-3 py-1.5 text-neutral-400">Previous</span>
              )}
              {pageNum < totalPages ? (
                <Link
                  href={buildSearchUrl({
                    ...filterBase,
                    page: String(pageNum + 1),
                  })}
                  className="rounded border border-neutral-300 px-3 py-1.5 font-semibold hover:bg-neutral-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded border border-neutral-100 px-3 py-1.5 text-neutral-400">Next</span>
              )}
            </div>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

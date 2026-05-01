import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";
import { MediaBulkUploadCard } from "@/components/teacher/media/MediaBulkUploadCard";
import {
  type DuplicateHandling,
  deleteTeacherMedia,
  inspectTeacherMediaBulkDuplicates,
  searchTeacherMedia,
  updateTeacherMediaMetadataFromForm,
  uploadTeacherMediaBulkFromForm,
  type MediaKind,
} from "@/lib/actions/media";

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

function toCsv(items: string[] | null | undefined): string {
  return (items ?? []).join(", ");
}

function buildSearchUrl(values: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v.trim()) sp.set(k, v.trim());
  }
  const qs = sp.toString();
  return qs ? `/teacher/media?${qs}` : "/teacher/media";
}

function classifyUploadFailure(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("file too large")) return "File too large";
  if (normalized.includes("only ") && normalized.includes("allowed")) return "Unsupported file type";
  if (normalized.includes("near-duplicate")) return "Near-duplicate blocked";
  if (normalized.includes("duplicate")) return "Duplicate blocked";
  if (normalized.includes("unauthorized")) return "Unauthorized";
  return "Other upload error";
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

  const assets = await searchTeacherMedia({
    q,
    kind: kind as "all" | "image" | "audio",
    level,
    wordType,
    countability: countability as "all" | "countable" | "uncountable" | "both" | "na",
    tags: csvToList(tags),
    categories: csvToList(categories),
    skills: csvToList(skills),
    limit: 800,
  });

  async function uploadAction(formData: FormData) {
    "use server";
    const uploadKind = (formData.get("kind") as MediaKind | null) ?? "image";
    const duplicateHandling =
      (formData.get("duplicate_handling") as DuplicateHandling | null) ?? "delete_duplicate";
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
    };
    let targetUrl = "";

    try {
      const result = await uploadTeacherMediaBulkFromForm(formData);
      const duplicateReusedCount = result.items.filter(
        (item) => item.status === "success" && item.duplicate_status === "exact_duplicate_reused",
      ).length;
      const uploadedCount = result.successCount - duplicateReusedCount;
      const failedItems = result.items.filter((item) => item.status === "error");
      const failureCounts = new Map<string, number>();
      for (const item of failedItems) {
        const key = classifyUploadFailure(item.message ?? "Upload failed");
        failureCounts.set(key, (failureCounts.get(key) ?? 0) + 1);
      }
      const failureSummary = [...failureCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `${reason} (${count})`)
        .join(", ");
      const failedPreviewNames = failedItems
        .slice(0, 3)
        .map((item) => item.filename)
        .join(", ");
      const hasPartialFailures = result.failureCount > 0;
      const statusValue = hasPartialFailures ? "partial_upload" : "uploaded";
      const summaryMessage = hasPartialFailures ?
          `Uploaded ${result.successCount}/${result.items.length} file(s). Failed ${result.failureCount}. Reasons: ${failureSummary || "Unknown"}.${failedPreviewNames ? ` Example file(s): ${failedPreviewNames}${failedItems.length > 3 ? ", ..." : ""}.` : ""}`
        : `Upload complete. Added ${uploadedCount} file(s)${duplicateReusedCount > 0 ? `, reused ${duplicateReusedCount} duplicate(s)` : ""}. Duplicate mode: ${duplicateHandling === "keep_both" ? "keep both" : "delete duplicate"}.`;
      targetUrl = buildSearchUrl({
        ...base,
        status: statusValue,
        kind: uploadKind,
        message: summaryMessage,
      });
    } catch (e) {
      targetUrl = buildSearchUrl({
        ...base,
        status: "error",
        message: e instanceof Error ? e.message : "Upload failed",
      });
    }
    redirect(targetUrl);
  }

  async function saveMetadataAction(formData: FormData) {
    "use server";
    await updateTeacherMediaMetadataFromForm(formData);
  }

  async function checkDuplicatesAction(formData: FormData) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <Link href="/teacher/courses" className="text-sm text-blue-700 underline">
          Go to Courses
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

      <MediaBulkUploadCard action={uploadAction} checkDuplicatesAction={checkDuplicatesAction} />

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold text-neutral-900">Search and filters</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            Search
            <input
              name="q"
              defaultValue={q}
              placeholder="filename, URL, tag, alt name..."
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
            <Link href="/teacher/media" className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold">
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">Assets ({assets.length})</h2>
          <div className="flex items-center gap-1">
            <Link
              href={buildSearchUrl({
                q,
                kind,
                level,
                word_type: wordType,
                countability,
                tags,
                categories,
                skills,
                view: "list",
              })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                view === "list" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
              }`}
            >
              List
            </Link>
            <Link
              href={buildSearchUrl({
                q,
                kind,
                level,
                word_type: wordType,
                countability,
                tags,
                categories,
                skills,
                view: "icons_small",
              })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${
                view === "icons_small" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
              }`}
            >
              Icons small
            </Link>
            <Link
              href={buildSearchUrl({
                q,
                kind,
                level,
                word_type: wordType,
                countability,
                tags,
                categories,
                skills,
                view: "icons_medium",
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
            No media matched your search.
          </p>
        ) : (
          <ul
            className={`grid gap-4 ${
              view === "list" ? "grid-cols-1" : view === "icons_small" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {assets.map((asset) => (
              <li key={asset.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{asset.meta_item_name || asset.original_filename}</p>
                    {asset.meta_item_name ? (
                      <p className="text-xs text-neutral-500">File: {asset.original_filename}</p>
                    ) : null}
                    <p className="text-xs text-neutral-600">{asset.content_type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={asset.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold"
                    >
                      Open
                    </a>
                    <form action={deleteAssetAction}>
                      <input type="hidden" name="id" value={asset.id} />
                      <ConfirmSubmitButton
                        type="submit"
                        confirmMessage="Delete this media asset permanently?"
                        className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 active:bg-red-100"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
                {asset.content_type.startsWith("image/") ? (
                  <div
                    className={`relative mt-3 w-full overflow-hidden rounded border border-neutral-300 bg-neutral-100 ${
                      view === "list" ? "h-40" : view === "icons_small" ? "h-28" : "h-36"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.public_url} alt="" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <audio className="mt-3 w-full" controls preload="metadata" src={asset.public_url} />
                )}

                <details className="mt-3 rounded border border-neutral-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                    Edit information box
                  </summary>
                  <form action={saveMetadataAction} className="grid gap-3 border-t border-neutral-200 p-3">
                    <input type="hidden" name="id" value={asset.id} />
                    <label className="text-sm">
                      Item name
                      <input
                        name="item_name"
                        defaultValue={asset.meta_item_name ?? ""}
                        placeholder="Display name for this item"
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Categories (csv)
                      <input
                        name="categories"
                        defaultValue={toCsv(asset.meta_categories)}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Tags (csv)
                      <input
                        name="tags"
                        defaultValue={toCsv(asset.meta_tags)}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Alternative names (csv)
                      <input
                        name="alternative_names"
                        defaultValue={toCsv(asset.meta_alternative_names)}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Plural
                      <input
                        name="plural"
                        defaultValue={asset.meta_plural ?? ""}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Countable vs uncountable
                      <select
                        name="countability"
                        defaultValue={asset.meta_countability ?? "na"}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="na">N/A</option>
                        <option value="countable">Countable</option>
                        <option value="uncountable">Uncountable</option>
                        <option value="both">Both</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Level
                      <input
                        name="level"
                        defaultValue={asset.meta_level ?? ""}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Grammar point (word type)
                      <input
                        name="word_type"
                        defaultValue={asset.meta_word_type ?? ""}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Skills (csv)
                      <input
                        name="skills"
                        defaultValue={toCsv(asset.meta_skills)}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Past tense
                      <input
                        name="past_tense"
                        defaultValue={asset.meta_past_tense ?? ""}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      Notes
                      <textarea
                        name="notes"
                        rows={2}
                        defaultValue={asset.meta_notes ?? ""}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Save info
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

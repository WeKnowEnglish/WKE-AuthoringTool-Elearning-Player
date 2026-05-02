"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  DuplicateHandling,
  MediaDuplicateIssue,
  UploadTeacherMediaBulkItemResult,
} from "@/lib/actions/media";

type Props = {
  inspectDuplicatesAction: (formData: FormData) => Promise<MediaDuplicateIssue[]>;
  uploadSingleAction: (formData: FormData) => Promise<UploadTeacherMediaBulkItemResult>;
};

type ReviewIssue = MediaDuplicateIssue & {
  decision: "keep_existing" | "keep_new";
};

type RowProgress = {
  phase: "queued" | "uploading" | "done";
  result?: UploadTeacherMediaBulkItemResult;
};

const UPLOAD_CONCURRENCY = 3;

function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return Promise.resolve();
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]!);
    }
  };
  const n = Math.min(limit, items.length);
  return Promise.all(Array.from({ length: n }, () => worker())).then(() => undefined);
}

function buildSingleUploadFormData(file: File, kind: string, duplicateHandling: DuplicateHandling): FormData {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  fd.set("duplicate_handling", duplicateHandling);
  return fd;
}

function duplicateResultHint(ds: UploadTeacherMediaBulkItemResult["duplicate_status"] | undefined): string {
  if (ds === "exact_duplicate_reused") return " — using existing file (exact match)";
  if (ds === "near_duplicate_reused") return " — kept existing (similar image)";
  return "";
}

export function MediaBulkUploadCard({ inspectDuplicatesAction, uploadSingleAction }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const kindRef = useRef<HTMLSelectElement | null>(null);
  const duplicateHandlingRef = useRef<HTMLSelectElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState("");
  const [startBusy, setStartBusy] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviewByIndex, setSelectedFilePreviewByIndex] = useState<Map<number, string>>(new Map());
  const [progressByIndex, setProgressByIndex] = useState<Partial<Record<number, RowProgress>>>({});
  const [dupApplyBusy, setDupApplyBusy] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const out = new Map<number, string>();
    selectedFiles.forEach((file, index) => {
      if (file.type.startsWith("image/")) {
        out.set(index, URL.createObjectURL(file));
      }
    });
    setSelectedFilePreviewByIndex(out);
    return () => {
      out.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  function setInputFiles(files: File[]) {
    const input = fileInputRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
    setSelectedFiles(files);
    setSessionActive(false);
    setReviewIssues([]);
    setProgressByIndex({});
    setDropError("");
  }

  function onInputChange() {
    setDropError("");
    setSessionActive(false);
    setReviewIssues([]);
    setProgressByIndex({});
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(Array.from(input.files));
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    if (!hasFiles) return;
    setIsDragOver(true);
    setDropError("");
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      setDropError("Drop files from your computer to upload.");
      return;
    }
    setInputFiles(Array.from(files));
  }

  function setIssueDecision(index: number, decision: "keep_existing" | "keep_new") {
    setReviewIssues((prev) =>
      prev.map((issue) => (issue.index === index ? { ...issue, decision } : issue)),
    );
  }

  function statusLineForIndex(i: number): string {
    const hasIssue = reviewIssues.some((x) => x.index === i);
    const p = progressByIndex[i];
    if (hasIssue && !p) {
      return "Needs review — choose an option on the card below, then Apply.";
    }
    if (!p) return "—";
    if (p.phase === "queued") return "Queued…";
    if (p.phase === "uploading") return "Uploading…";
    if (p.result?.status === "error") return p.result.message ?? "Error";
    if (p.result?.status === "success") {
      const hint = duplicateResultHint(p.result.duplicate_status);
      return `Done${hint}`;
    }
    return "Done";
  }

  async function onStartUpload() {
    setDropError("");
    const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];
    if (files.length === 0) {
      setDropError("Select at least one file to upload.");
      return;
    }
    if (startBusy) return;

    const kind = kindRef.current?.value ?? "image";
    const defaultDup =
      (duplicateHandlingRef.current?.value as DuplicateHandling | null) ?? "delete_duplicate";

    setStartBusy(true);
    try {
      const inspectFd = new FormData();
      inspectFd.set("kind", kind);
      files.forEach((f) => inspectFd.append("files", f));
      const issues = await inspectDuplicatesAction(inspectFd);

      setSessionActive(true);
      const issueIndices = new Set(issues.map((x) => x.index));
      const defaultDecision = defaultDup === "keep_both" ? "keep_new" : "keep_existing";
      setReviewIssues(issues.map((issue) => ({ ...issue, decision: defaultDecision })));

      const cleanIndices = files.map((_, i) => i).filter((i) => !issueIndices.has(i));
      const initial: Partial<Record<number, RowProgress>> = {};
      for (const i of cleanIndices) initial[i] = { phase: "queued" };
      setProgressByIndex(initial);

      await runPool(cleanIndices, UPLOAD_CONCURRENCY, async (i) => {
        setProgressByIndex((prev) => ({ ...prev, [i]: { phase: "uploading" } }));
        const result = await uploadSingleAction(buildSingleUploadFormData(files[i]!, kind, defaultDup));
        setProgressByIndex((prev) => ({ ...prev, [i]: { phase: "done", result } }));
      });

      router.refresh();
    } catch (error) {
      setSessionActive(false);
      setReviewIssues([]);
      setProgressByIndex({});
      setDropError(error instanceof Error ? error.message : "Upload failed to start.");
    } finally {
      setStartBusy(false);
    }
  }

  async function onApplyDuplicate(issue: ReviewIssue) {
    const files = selectedFiles;
    const file = files[issue.index];
    if (!file) return;

    const kind = kindRef.current?.value ?? "image";
    const duplicateHandling: DuplicateHandling =
      issue.decision === "keep_new" ? "keep_both" : "delete_duplicate";

    setDupApplyBusy((prev) => new Set(prev).add(issue.index));
    setProgressByIndex((prev) => ({ ...prev, [issue.index]: { phase: "uploading" } }));
    try {
      const result = await uploadSingleAction(buildSingleUploadFormData(file, kind, duplicateHandling));
      setProgressByIndex((prev) => ({
        ...prev,
        [issue.index]: { phase: "done", result },
      }));
      router.refresh();
    } catch (error) {
      setProgressByIndex((prev) => ({
        ...prev,
        [issue.index]: {
          phase: "done",
          result: {
            filename: file.name,
            status: "error",
            message: error instanceof Error ? error.message : "Upload failed",
          },
        },
      }));
    } finally {
      setDupApplyBusy((prev) => {
        const next = new Set(prev);
        next.delete(issue.index);
        return next;
      });
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-bold text-neutral-900">Upload media</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Start upload checks duplicates. Files with no conflict upload immediately. For each duplicate pair, choose an
        option and click Apply — other files are not blocked.
      </p>
      <div
        className={`mt-3 rounded border border-dashed p-3 transition ${
          isDragOver ? "border-blue-400 bg-blue-50" : "border-neutral-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-neutral-800">
            Type
            <select
              ref={kindRef}
              name="kind"
              defaultValue="image"
              className="mt-1 block rounded border px-2 py-1 text-sm"
            >
              <option value="image">Image</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-800">
            Files
            <input
              ref={fileInputRef}
              name="files"
              type="file"
              multiple
              className="mt-1 block rounded border px-2 py-1 text-sm"
              onChange={onInputChange}
            />
          </label>
          <label className="text-sm font-medium text-neutral-800">
            Default for non-conflicting files
            <select
              ref={duplicateHandlingRef}
              name="duplicate_handling"
              defaultValue="delete_duplicate"
              className="mt-1 block rounded border px-2 py-1 text-sm"
            >
              <option value="delete_duplicate">Prefer existing (exact match reuses library file)</option>
              <option value="keep_both">Upload new copies when needed</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onStartUpload}
            disabled={startBusy}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {startBusy ? "Working…" : "Start upload"}
          </button>
        </div>
      </div>

      {dropError ? <p className="mt-2 text-xs text-red-700">{dropError}</p> : null}

      {sessionActive && selectedFiles.length > 0 ? (
        <div className="mt-3 rounded border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-semibold text-neutral-800">This batch</p>
          <ul className="mt-2 space-y-1 text-xs text-neutral-700">
            {selectedFiles.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex flex-wrap justify-between gap-2">
                <span className="font-medium text-neutral-900">{file.name}</span>
                <span className="text-neutral-600">{statusLineForIndex(i)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {reviewIssues.length > 0 ? (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {reviewIssues.length} duplicate match(es) — resolve each when ready (other files already uploaded if listed
            as done).
          </p>
          <ul className="mt-3 space-y-3">
            {reviewIssues.map((issue) => {
              const previewUrl = selectedFilePreviewByIndex.get(issue.index);
              const busy = dupApplyBusy.has(issue.index);
              const done = progressByIndex[issue.index]?.phase === "done";
              return (
                <li key={`${issue.index}-${issue.existing_id}`} className="rounded border border-amber-200 bg-white p-3">
                  <p className="text-sm font-semibold text-neutral-900">
                    {issue.filename} ({issue.duplicate_kind === "exact" ? "exact duplicate" : "near duplicate"})
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="rounded border border-neutral-200 p-2">
                      <p className="text-xs font-semibold text-neutral-700">New upload</p>
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="" className="mt-2 h-28 w-full rounded object-contain" />
                      ) : (
                        <p className="mt-2 text-xs text-neutral-500">Preview unavailable</p>
                      )}
                    </div>
                    <div className="rounded border border-neutral-200 p-2">
                      <p className="text-xs font-semibold text-neutral-700">Existing in library</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={issue.existing_url} alt="" className="mt-2 h-28 w-full rounded object-contain" />
                      <p className="mt-1 text-xs text-neutral-500">{issue.existing_filename}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`decision-visible-${issue.index}`}
                        checked={issue.decision === "keep_existing"}
                        disabled={done}
                        onChange={() => setIssueDecision(issue.index, "keep_existing")}
                      />
                      Keep existing
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`decision-visible-${issue.index}`}
                        checked={issue.decision === "keep_new"}
                        disabled={done}
                        onChange={() => setIssueDecision(issue.index, "keep_new")}
                      />
                      Upload new copy
                    </label>
                    <button
                      type="button"
                      disabled={busy || done}
                      onClick={() => onApplyDuplicate(issue)}
                      className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Applying…" : done ? "Applied" : "Apply for this file"}
                    </button>
                  </div>
                  {progressByIndex[issue.index]?.result?.status === "error" ? (
                    <p className="mt-2 text-xs text-red-700">
                      {progressByIndex[issue.index]?.result?.message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

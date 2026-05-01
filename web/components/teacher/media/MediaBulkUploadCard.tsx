"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { MediaDuplicateIssue } from "@/lib/actions/media";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  checkDuplicatesAction: (formData: FormData) => Promise<MediaDuplicateIssue[]>;
};

function SubmitState() {
  const { pending } = useFormStatus();
  return (
    <p className="mt-2 text-xs text-neutral-500">
      {pending ? "Uploading..." : "Select files, review duplicates, then upload."}
    </p>
  );
}

type ReviewIssue = MediaDuplicateIssue & {
  decision: "keep_existing" | "keep_new";
};

export function MediaBulkUploadCard({ action, checkDuplicatesAction }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const kindRef = useRef<HTMLSelectElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState("");
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviewByIndex, setSelectedFilePreviewByIndex] = useState<Map<number, string>>(new Map());

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

  function resetReview() {
    setReviewIssues([]);
  }

  function setInputFiles(files: File[]) {
    const input = fileInputRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
    setSelectedFiles(files);
    resetReview();
  }

  function onInputChange() {
    setDropError("");
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setSelectedFiles([]);
      resetReview();
      return;
    }
    setSelectedFiles(Array.from(input.files));
    resetReview();
  }

  function onDragOver(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    if (!hasFiles) return;
    setIsDragOver(true);
    setDropError("");
  }

  function onDragLeave(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function onDrop(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      setDropError("Drop files from your computer to upload.");
      return;
    }
    setInputFiles(Array.from(files));
  }

  async function onCheckAndUpload() {
    setDropError("");
    const input = fileInputRef.current;
    const files = input?.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      setDropError("Select at least one file to upload.");
      return;
    }

    if (reviewIssues.length === 0) {
      try {
        setIsCheckingDuplicates(true);
        const formData = new FormData();
        formData.set("kind", kindRef.current?.value ?? "image");
        files.forEach((file) => formData.append("files", file));
        const issues = await checkDuplicatesAction(formData);
        if (issues.length > 0) {
          setReviewIssues(issues.map((issue) => ({ ...issue, decision: "keep_existing" })));
          return;
        }
      } catch (error) {
        setDropError(error instanceof Error ? error.message : "Failed to check duplicates.");
        return;
      } finally {
        setIsCheckingDuplicates(false);
      }
    }

    formRef.current?.requestSubmit();
  }

  function setIssueDecision(index: number, decision: "keep_existing" | "keep_new") {
    setReviewIssues((prev) =>
      prev.map((issue) => {
        if (issue.index !== index) return issue;
        return { ...issue, decision };
      }),
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-bold text-neutral-900">Upload media</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Choose how duplicates are handled before upload.
      </p>
      <form
        ref={formRef}
        action={action}
        className={`mt-3 flex flex-wrap items-end gap-3 rounded border border-dashed p-3 transition ${
          isDragOver ? "border-blue-400 bg-blue-50" : "border-neutral-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
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
            required
            multiple
            className="mt-1 block rounded border px-2 py-1 text-sm"
            onChange={onInputChange}
          />
        </label>
        <label className="text-sm font-medium text-neutral-800">
          Duplicates
          <select
            name="duplicate_handling"
            defaultValue="delete_duplicate"
            className="mt-1 block rounded border px-2 py-1 text-sm"
          >
            <option value="delete_duplicate">Delete duplicate (keep existing)</option>
            <option value="keep_both">Keep both</option>
          </select>
        </label>
        {reviewIssues.map((issue) => (
          <input
            key={`decision-hidden-${issue.index}`}
            type="hidden"
            name={`duplicate_decision_${issue.index}`}
            value={issue.decision}
          />
        ))}
        <button
          type="button"
          onClick={onCheckAndUpload}
          disabled={isCheckingDuplicates}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isCheckingDuplicates ? "Checking duplicates..." : "Check duplicates & upload"}
        </button>
        <SubmitState />
      </form>
      {dropError ? <p className="mt-2 text-xs text-red-700">{dropError}</p> : null}
      {reviewIssues.length > 0 ? (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {reviewIssues.length} duplicate match(es) found. Choose issue by issue.
          </p>
          <ul className="mt-3 space-y-3">
            {reviewIssues.map((issue) => {
              const previewUrl = selectedFilePreviewByIndex.get(issue.index);
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
                        onChange={() => setIssueDecision(issue.index, "keep_existing")}
                      />
                      Keep existing
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`decision-visible-${issue.index}`}
                        checked={issue.decision === "keep_new"}
                        onChange={() => setIssueDecision(issue.index, "keep_new")}
                      />
                      Keep new upload
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

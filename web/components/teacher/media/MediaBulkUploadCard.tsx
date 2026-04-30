"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

function SubmitState() {
  const { pending } = useFormStatus();
  return (
    <p className="mt-2 text-xs text-neutral-500">
      {pending ? "Uploading..." : "Select files or drag them here to upload immediately."}
    </p>
  );
}

export function MediaBulkUploadCard({ action }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState("");

  function submitForm() {
    formRef.current?.requestSubmit();
  }

  function onInputChange() {
    setDropError("");
    const input = fileInputRef.current;
    if (!input?.files?.length) return;
    submitForm();
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
    const input = fileInputRef.current;
    if (!input) return;

    const transfer = new DataTransfer();
    for (const file of Array.from(files)) {
      transfer.items.add(file);
    }
    input.files = transfer.files;
    submitForm();
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-bold text-neutral-900">Upload media</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Exact duplicate images are auto-reused. Near-duplicate images are blocked.
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
          <select name="kind" defaultValue="image" className="mt-1 block rounded border px-2 py-1 text-sm">
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
        <SubmitState />
      </form>
      {dropError ? <p className="mt-2 text-xs text-red-700">{dropError}</p> : null}
    </section>
  );
}

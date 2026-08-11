"use client";

import { useState } from "react";

export function ClassroomDiagnosticsExportButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/virtual-classroom/${sessionId}/diagnostics`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not build the report.");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `classroom-diagnostics-${sessionId}-${new Date().toISOString().replaceAll(":", "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Could not build the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"
      >
        {busy ? "Building report…" : "Download class diagnostics"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}


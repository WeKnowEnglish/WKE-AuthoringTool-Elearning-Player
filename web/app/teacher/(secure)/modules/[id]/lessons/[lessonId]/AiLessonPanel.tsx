"use client";

type Props = {
  /** Kept for a stable sidebar call site; content is informational only. */
  sidebar?: boolean;
};

/**
 * Gemini drafting and screen generation live under the header **Plan** button (with objectives and the plan doc).
 * This note points teachers to that flow; skills and import tools stay in the right sidebar.
 */
export function AiLessonPanel({ sidebar }: Props) {
  return (
    <section
      className={`rounded-lg border border-amber-200 bg-amber-50 shadow-sm ${sidebar ? "p-3" : "p-4"}`}
    >
      <h2 className={`font-bold text-amber-950 ${sidebar ? "text-sm" : "text-lg"}`}>AI (Gemini)</h2>
      <p className={`mt-1 text-amber-900 ${sidebar ? "text-xs leading-snug" : "text-sm"}`}>
        Open <strong>Plan</strong> in the top bar: set <strong>learning objectives</strong>, write or paste a plan, run{" "}
        <strong>Draft plan with AI</strong> (fills an empty plan or <strong>enhances</strong> what you wrote), then{" "}
        <strong>Generate activities</strong> to append screens. Requires{" "}
        <code className="rounded bg-white px-1">GEMINI_API_KEY</code> on the server.
      </p>
    </section>
  );
}

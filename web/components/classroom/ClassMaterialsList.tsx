import type { StudentClassMaterial } from "@/lib/class-lessons/types";
import {
  CLASS_LESSON_PHASE_LABELS,
  CLASS_LESSON_STEP_KIND_LABELS,
} from "@/lib/class-lessons/types";

type Props = {
  materials: StudentClassMaterial[];
  tone?: "primary" | "secondary";
};

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClassMaterialsList({ materials, tone = "primary" }: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.75rem] border border-[var(--pl-border,#e5e0f0)] bg-white shadow-sm";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted,#64748b)]";

  return (
    <section
      className={`${shell} p-5 sm:p-6`}
      aria-labelledby="classroom-materials-heading"
    >
      <h2
        id="classroom-materials-heading"
        className={`text-base font-extrabold ${
          isSecondary ? "text-sec-ink" : "text-neutral-900"
        }`}
      >
        Class materials
      </h2>

      {materials.length === 0 ? (
        <p className={`mt-2 text-sm ${muted}`}>
          Lesson materials your teacher publishes for this class will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {materials.map((material) => (
            <li
              key={material.id}
              className={`rounded-xl border p-4 ${
                isSecondary ? "border-sec-border" : "border-[var(--pl-border,#e5e0f0)]"
              }`}
            >
              <p className={`text-xs font-semibold ${muted}`}>
                Published {formatPublishedDate(material.publishedAt)}
              </p>
              <p className="mt-1 text-base font-extrabold text-neutral-900">
                {material.title}
              </p>
              {material.steps.length > 0 ? (
                <ol className="mt-3 space-y-2">
                  {material.steps.map((step) => (
                    <li
                      key={`${material.id}-${step.position}`}
                      className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
                    >
                      <span className="text-xs font-semibold text-neutral-500">
                        {step.position + 1}. {CLASS_LESSON_PHASE_LABELS[step.phase]} ·{" "}
                        {step.durationMinutes} min · {CLASS_LESSON_STEP_KIND_LABELS[step.kind]}
                      </span>
                      <span className="mt-0.5 block font-semibold">{step.title}</span>
                      {step.studentAction ? (
                        <span className="mt-0.5 block text-neutral-600">
                          {step.studentAction}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { GrammarModuleIssue } from "@/lib/grammar-builder/validate-module";

type Props = {
  issues: GrammarModuleIssue[];
  strictValid: boolean;
  previewMode: boolean;
};

export function GrammarPosterValidationPanel({ issues, strictValid, previewMode }: Props) {
  const label =
    previewMode ?
      strictValid ?
        "Student preview is valid"
      : "Student preview has errors"
    : strictValid ?
      "Module is valid"
    : "Validation warnings";

  return (
    <section className="rounded-xl border-2 border-kid-ink/15 bg-white/80 p-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">
        Validation
      </h3>
      <p
        className={
          strictValid ?
            "mt-1 text-sm font-semibold text-emerald-700"
          : "mt-1 text-sm font-semibold text-amber-800"
        }
      >
        {label}
      </p>
      {!strictValid && issues.length > 0 ?
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs font-medium text-kid-ink/80">
          {issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`} className="font-mono">
              <span className="text-kid-ink/50">{issue.path}</span>: {issue.message}
            </li>
          ))}
        </ul>
      : null}
    </section>
  );
}

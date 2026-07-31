import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import Link from "next/link";

/** Progress placeholder — full MVP in a later slice. */
export function SecondaryProgressPlaceholder() {
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <header className="rounded-xl border border-sec-border bg-sec-card p-5">
        <p className={secondaryUi.eyebrow}>Progress</p>
        <h1 className={`mt-1 ${secondaryUi.pageTitle}`}>Your progress</h1>
        <p className={`mt-2 ${secondaryUi.bodyMuted}`}>
          A clearer view of words you know and today&apos;s practice is coming soon. For now, keep
          going on Learn.
        </p>
        <Link href="/secondary/learn" className={`mt-4 inline-flex ${secondaryUi.btnPrimary}`}>
          Open Learn
        </Link>
      </header>
    </section>
  );
}

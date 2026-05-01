export default function LearnLessonLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-kid-ink/10" />
      <div className="h-40 w-full animate-pulse rounded-2xl border-2 border-kid-ink/20 bg-kid-panel/60" />
      <p className="text-sm font-semibold text-neutral-500">Loading lesson…</p>
    </div>
  );
}

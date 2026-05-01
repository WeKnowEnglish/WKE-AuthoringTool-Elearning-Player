export default function LearnLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-xl bg-kid-ink/10" />
      <div className="h-32 w-full animate-pulse rounded-2xl border-2 border-kid-ink/20 bg-kid-panel/60" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-kid-ink/5" />
      <p className="text-sm font-semibold text-neutral-500">Loading…</p>
    </div>
  );
}

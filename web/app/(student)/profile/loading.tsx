export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-kid-ink/10" />
      <div className="h-40 w-full animate-pulse rounded-2xl border-2 border-kid-ink/20 bg-kid-panel/60" />
      <p className="text-sm font-semibold text-neutral-500">Loading…</p>
    </div>
  );
}

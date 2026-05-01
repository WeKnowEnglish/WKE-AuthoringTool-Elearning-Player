export default function TeacherSecureLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <div className="h-8 w-56 animate-pulse rounded-md bg-neutral-200" />
      <div className="h-36 w-full animate-pulse rounded-lg border border-neutral-200 bg-neutral-50" />
      <p className="text-sm text-neutral-500">Loading…</p>
    </div>
  );
}

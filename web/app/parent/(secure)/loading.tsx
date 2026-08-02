export default function ParentPortalLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading parent portal">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

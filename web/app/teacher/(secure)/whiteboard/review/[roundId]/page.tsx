import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { getRoundReviewBundle } from "@/lib/whiteboard/server/history";

type Props = {
  params: Promise<{ roundId: string }>;
};

export const metadata = {
  title: "Whiteboard review",
  robots: { index: false, follow: false },
};

function previewSrc(path: string | null, dataUrl: string | null): string | null {
  if (path) return `/api/whiteboard/preview?path=${encodeURIComponent(path)}`;
  return dataUrl;
}

export default async function WhiteboardReviewPage({ params }: Props) {
  const { roundId } = await params;
  const bundle = await getRoundReviewBundle(decodeURIComponent(roundId));
  if (!bundle) notFound();

  if (bundle.round.classId) {
    try {
      await requireWhiteboardTeacher(bundle.round.classId, { allowArchived: true });
    } catch {
      notFound();
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href={
          bundle.round.classId
            ? `/teacher/classes/${bundle.round.classId}`
            : "/teacher/classes"
        }
        className="text-sm text-blue-700 underline"
      >
        ← Back to class
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{bundle.round.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {bundle.round.instructions || "Read-only review of submitted boards."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Phase {bundle.round.phase}
          {bundle.round.archivedAt ? " · archived" : ""} · join {bundle.round.joinCode}
        </p>
      </header>

      {bundle.submissions.length === 0 ? (
        <p className="text-sm text-slate-600">No submissions stored for this round yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bundle.submissions.map((sub) => {
            const src = previewSrc(sub.previewPath, sub.previewDataUrl);
            return (
              <figure
                key={sub.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="aspect-video w-full object-contain bg-slate-50" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-slate-50 text-sm text-slate-500">
                    No preview
                  </div>
                )}
                <figcaption className="space-y-1 p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {sub.ownerType} · {sub.ownerId.slice(0, 10)}
                  </p>
                  <p>
                    rev {sub.revision} · {new Date(sub.submittedAt).toLocaleString()}
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

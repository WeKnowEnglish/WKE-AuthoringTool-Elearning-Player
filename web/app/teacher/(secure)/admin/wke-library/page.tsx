import Link from "next/link";
import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { WkeLibraryReviewQueue } from "@/components/teacher/admin/WkeLibraryReviewQueue";
import { countPendingWkeLibrarySubmissions } from "@/lib/actions/wke-library";

export const metadata = {
  title: "WKE Library review — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminWkeLibraryPage() {
  let pendingCount = 0;
  try {
    pendingCount = await countPendingWkeLibrarySubmissions();
  } catch {
    pendingCount = 0;
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">WKE Library review</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Approve teacher contributions into the public catalog, or reject them. Private
          Activity Bank items are never shared automatically.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {pendingCount} pending ·{" "}
          <Link
            href="/teacher/activity-builder/library"
            className="font-semibold underline"
          >
            Open public library
          </Link>
        </p>
      </div>

      <AdminSubnav active="wke-library" />

      <WkeLibraryReviewQueue />
    </>
  );
}

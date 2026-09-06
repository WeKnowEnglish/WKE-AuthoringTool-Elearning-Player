import { AdminLessonPackagesPanel } from "@/components/teacher/admin/AdminLessonPackagesPanel";
import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { listAdminLessonPackages } from "@/lib/data/lesson-packages";

export const metadata = {
  title: "Lesson packages — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLessonPackagesPage() {
  const result = await listAdminLessonPackages();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Lesson packages</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Create and price packs of 8 lessons for parent checkout. The next Stripe payment uses
          the saved price; existing paid orders keep the amount charged at purchase.
        </p>
      </div>
      <AdminSubnav active="packages" />
      {result.ok ? (
        <AdminLessonPackagesPanel packages={result.packages} />
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {result.error}
        </div>
      )}
    </>
  );
}

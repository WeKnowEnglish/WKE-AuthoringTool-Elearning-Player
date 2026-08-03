import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ParentAuthForm } from "@/components/parent/ParentAuthForm";
import { safeParentPath } from "@/lib/parent/parent-routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parent sign in | We Know English",
  robots: { index: false, follow: false },
};

export default async function ParentLoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;
  const destination = safeParentPath(next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(destination);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
          We Know English
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Parent portal</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          See teacher-approved class updates and a clear story of your child&apos;s learning.
        </p>
        <div className="mt-7">
          <ParentAuthForm nextPath={destination} />
        </div>
      </div>
    </main>
  );
}

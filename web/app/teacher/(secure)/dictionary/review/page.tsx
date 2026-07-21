import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LexiconPromotionQueueClient,
  type LexiconReviewTab,
} from "@/components/teacher/word-packs/LexiconPromotionQueueClient";
import { isTeacherLight } from "@/lib/auth/roles";
import { listLexiconReviewBucket } from "@/lib/data/teacher-lexicon";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lexicon review — Teacher",
  description: "Admin queue for teacher dictionary additions and submissions.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function parseTab(raw: string): LexiconReviewTab {
  if (raw === "added" || raw === "approved") return raw;
  return "submitted";
}

export default async function LexiconPromotionReviewPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (isTeacherLight(user)) {
    redirect("/teacher/word-packs");
  }

  const params = (await searchParams) ?? {};
  const initialTab = parseTab(firstParam(params.tab));

  const [added, submitted, approved] = await Promise.all([
    listLexiconReviewBucket("added"),
    listLexiconReviewBucket("submitted"),
    listLexiconReviewBucket("approved"),
  ]);

  const canReviewAll =
    added.canReviewAll || submitted.canReviewAll || approved.canReviewAll;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/teacher/word-packs" className="font-medium text-neutral-700 underline">
            Word packs
          </Link>
          {" · "}
          Lexicon review
        </p>
        <h1 className="mt-1 text-2xl font-bold">Lexicon review</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Browse every teacher’s dictionary additions, pending submissions, and approved platform
          publishes. Approve on the Submitted tab writes a shared <code className="text-xs">pv_*</code>{" "}
          entry.
        </p>
      </div>

      <LexiconPromotionQueueClient
        canReviewAll={canReviewAll}
        added={added.entries}
        submitted={submitted.entries}
        approved={approved.entries}
        initialTab={initialTab}
      />
    </div>
  );
}

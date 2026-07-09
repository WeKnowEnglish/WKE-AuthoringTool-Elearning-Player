"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSecondarySentenceSubmission } from "@/lib/actions/teacher-sentence-review";
import type { TeacherSentenceSubmission } from "@/lib/data/teacher-sentence-submissions";
import { formatRelativeDate } from "@/lib/mastery/teacher-mastery-display";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

type Props = {
  classId: string;
  submissions: TeacherSentenceSubmission[];
};

function statusLabel(status: TeacherSentenceSubmission["status"]): string {
  switch (status) {
    case "submitted":
      return "Waiting for review";
    case "approved":
      return "Approved";
    case "needs_revision":
      return "Needs revision";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

function ReviewActions({
  classId,
  submission,
}: {
  classId: string;
  submission: TeacherSentenceSubmission;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (submission.status !== "submitted") {
    return <span className="text-xs text-neutral-500">{statusLabel(submission.status)}</span>;
  }

  function runReview(outcome: "approve" | "needs_revision") {
    setError(null);
    startTransition(async () => {
      const result = await reviewSecondarySentenceSubmission({
        classId,
        submissionId: submission.id,
        outcome,
        comment: outcome === "needs_revision" ? comment : null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setShowRevisionForm(false);
      setComment("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {!showRevisionForm ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => runReview("approve")}
            className="rounded border border-emerald-700 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowRevisionForm(true)}
            className="rounded border border-amber-700 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 disabled:opacity-60"
          >
            Request revision
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[4rem] rounded border border-neutral-300 px-2 py-1 text-xs"
            maxLength={500}
            placeholder="Short note for the student"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || !comment.trim()}
              onClick={() => runReview("needs_revision")}
              className="rounded border border-amber-700 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 disabled:opacity-60"
            >
              Send revision note
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowRevisionForm(false);
                setComment("");
                setError(null);
              }}
              className="rounded border px-2 py-1 text-xs font-semibold text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

export function SentenceReviewTable({ classId, submissions }: Props) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const filtered = useMemo(() => {
    if (filter === "pending") {
      return submissions.filter((submission) => submission.status === "submitted");
    }
    return submissions;
  }, [filter, submissions]);

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No sentence submissions yet. Students submit from Secondary → Sentence activity.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            filter === "pending" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            filter === "all" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          All recent
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-600">No submissions in this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Word</th>
                <th className="px-4 py-3 font-semibold">Sentence</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission) => {
                const vocab = getSecondaryVocabItemById(submission.wordItemId);
                return (
                  <tr key={submission.id} className="border-b align-top last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{vocab?.word ?? submission.wordItemId}</p>
                      {vocab?.studentMeaningEn ? (
                        <p className="mt-0.5 text-xs text-neutral-500">{vocab.studentMeaningEn}</p>
                      ) : null}
                    </td>
                    <td className="max-w-md px-4 py-3 text-neutral-800">{submission.sentenceText}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatRelativeDate(submission.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-neutral-700">
                        {statusLabel(submission.status)}
                      </span>
                      {submission.teacherComment ? (
                        <p className="mt-1 text-xs text-neutral-600">{submission.teacherComment}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <ReviewActions classId={classId} submission={submission} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

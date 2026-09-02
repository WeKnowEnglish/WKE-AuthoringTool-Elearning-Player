import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeworkCollectionReviewForm } from "@/components/teacher/homework/HomeworkCollectionReviewForm";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { getClassHomework } from "@/lib/data/class-homework";
import { listHomeworkCollectionAttemptsForTeacher } from "@/lib/data/homework-collection-attempts";
import { listHomeworkCollectionSpeakingRecordingsForTeacher } from "@/lib/data/homework-collection-speaking-recordings";
import { getTeacherClass } from "@/lib/data/teacher-classes";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";
import { lessonPlayerPackItemIds } from "@/lib/homework-collections/lesson-player-pack";
import { documentModuleItemIds } from "@/lib/homework-collections/document-module";
import { CreativePresentationViewer } from "@/components/homework/CreativePresentationViewer";

function itemLabel(part: HomeworkCollectionPart, itemId: string): string {
  if (part.kind === "multiple_choice") return part.questions.find((item) => item.id === itemId)?.prompt ?? itemId;
  if (part.kind === "line_match") return part.pairs.find((item) => item.id === itemId)?.left ?? itemId;
  if (part.kind === "free_response") return part.prompts.find((item) => item.id === itemId)?.prompt ?? itemId;
  if (part.kind === "speaking_prompt") return part.prompt;
  if (part.kind === "listening_item_match") {
    return part.activity.prompts.find((item) => item.id === itemId)?.label ?? itemId;
  }
  if (part.kind === "lesson_player_pack") {
    const index = lessonPlayerPackItemIds(part).indexOf(itemId);
    return index >= 0 ? `${part.studioFormat} item ${index + 1}` : itemId;
  }
  if (part.kind === "document_module") {
    const index = documentModuleItemIds(part).indexOf(itemId);
    return index >= 0
      ? `${part.moduleFormat.replace(/_/g, " ")} ${index + 1}`
      : itemId;
  }
  if (part.kind === "letter_mixup" || part.kind === "listen_and_choose" || part.kind === "sentence_scramble") {
    return part.items.find((item) => item.id === itemId)?.prompt ?? itemId;
  }
  return itemId;
}

function displayAnswer(part: HomeworkCollectionPart, answer: string): string {
  if (part.kind === "multiple_choice") {
    for (const question of part.questions) {
      const option = question.options.find((item) => item.id === answer);
      if (option) return option.text;
    }
  }
  if (part.kind === "line_match") {
    const pair = part.pairs.find((item) => item.id === answer);
    if (pair) return pair.right || "Picture match";
  }
  if (part.kind === "listen_and_choose") {
    for (const item of part.items) {
      const choice = item.choices.find((entry) => entry.id === answer);
      if (choice) return choice.label || "Picture choice";
    }
  }
  if (part.kind === "listening_item_match") {
    const choice = part.activity.choices.find((entry) => entry.id === answer);
    if (choice) return choice.label || "Choice";
  }
  return answer;
}

function speakingRecordingForAnswer(
  recordings: readonly AssessmentSpeakingRecording[],
  part: HomeworkCollectionPart,
  answer: string,
): AssessmentSpeakingRecording | null {
  if (part.kind !== "speaking_prompt") return null;
  return (
    recordings.find(
      (recording) =>
        recording.id === answer &&
        recording.partId === part.id &&
        recording.responseId === part.responseId,
    ) ?? null
  );
}

export default async function HomeworkCollectionResultsPage({
  params,
}: {
  params: Promise<{ classId: string; homeworkId: string }>;
}) {
  const { classId, homeworkId } = await params;
  const [teacherClass, homework, attempts, speakingByStudent] = await Promise.all([
    getTeacherClass(classId),
    getClassHomework(homeworkId),
    listHomeworkCollectionAttemptsForTeacher({ classId, homeworkId }),
    listHomeworkCollectionSpeakingRecordingsForTeacher({ classId, homeworkId }),
  ]);
  if (!teacherClass || !homework || homework.classId !== classId || homework.payload.type !== "graded_track") {
    notFound();
  }
  const freeze = parseGradedTrackFreezeDocument(homework.payload.document);
  const document = freeze?.collectionDocument;
  if (!document) notFound();
  const partById = new Map(document.parts.map((part) => [part.id, part]));

  return (
    <main className="space-y-5">
      <Link href={`/teacher/classes/${classId}?tab=students`} className="text-sm font-semibold text-teal-700 underline">
        ← Students &amp; Homework
      </Link>
      <header className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {teacherClass.title} · homework collection results
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{homework.title}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Objective activities are scored from the frozen answer key. Review written and spoken responses here.
        </p>
      </header>

      {attempts.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
          No students have saved work in the collection yet.
        </section>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const studentRecordings = speakingByStudent.get(attempt.studentId) ?? [];
            const reviewed = Object.values(attempt.review?.parts ?? {});
            const reviewedScore = reviewed.reduce((total, part) => total + part.score, 0);
            const reviewedMax = reviewed.reduce((total, part) => total + part.maxScore, 0);
            const manualParts = Object.values(attempt.content.parts)
              .filter((part) => part.gradingMode === "teacher_review")
              .map((part) => ({
                id: part.partId,
                label: partById.get(part.partId)?.title ?? part.partId,
                maxScore: part.maxScore,
              }));
            return (
              <section key={attempt.id} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">{attempt.displayName}</h2>
                    <p className="text-xs text-neutral-500">
                      Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(attempt.updatedAt))}
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-700">
                      Recorded: {attempt.autoScore + reviewedScore}/{attempt.autoMaxScore + (reviewedMax || attempt.manualMaxScore)}
                      {attempt.manualMaxScore > reviewedMax ? " · review pending" : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.status === "submitted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                    {attempt.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {Object.values(attempt.content.parts).map((scored) => {
                    const part = partById.get(scored.partId);
                    if (!part) return null;
                    return (
                      <article key={scored.partId} className={`rounded-lg border border-neutral-200 bg-neutral-50 p-4 ${part.kind === "creative_presentation" ? "lg:col-span-2" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-neutral-900">{part.title}</h3>
                          {scored.correct === null ? (
                            <span className="text-xs font-semibold text-violet-700">Teacher review</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700">{scored.correct}/{scored.maxScore}</span>
                          )}
                        </div>
                        {part.kind === "creative_presentation" ? (
                          <div className="mt-4">
                            <CreativePresentationViewer
                              part={part}
                              answers={scored.answers}
                              studentName={attempt.displayName}
                            />
                          </div>
                        ) : (
                        <dl className="mt-3 space-y-2">
                          {Object.entries(scored.answers).map(([itemId, answer]) => {
                            const recording = part
                              ? speakingRecordingForAnswer(studentRecordings, part, answer)
                              : null;
                            return (
                            <div key={itemId}>
                              <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{itemLabel(part, itemId)}</dt>
                              <dd className="whitespace-pre-wrap text-sm font-medium text-neutral-800">
                                {recording?.url ? (
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={recording.url}
                                    className="mt-1 w-full"
                                  />
                                ) : (
                                  displayAnswer(part, answer)
                                )}
                              </dd>
                            </div>
                            );
                          })}
                        </dl>
                        )}
                      </article>
                    );
                  })}
                </div>

                <HomeworkCollectionReviewForm
                  classId={classId}
                  homeworkId={homeworkId}
                  attemptId={attempt.id}
                  parts={manualParts}
                  initialParts={attempt.review?.parts ?? {}}
                  initialFeedback={attempt.review?.feedback ?? ""}
                />
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

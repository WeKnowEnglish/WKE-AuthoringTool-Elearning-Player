import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkWritingPromptPlayer } from "@/components/homework/HomeworkWritingPromptPlayer";
import { HomeworkCollectionPlayer } from "@/components/homework/HomeworkCollectionPlayer";
import { HomeworkFlashcardsPlayer } from "@/components/primary/HomeworkFlashcardsPlayer";
import { HomeworkPackQuizPlayer } from "@/components/primary/HomeworkPackQuizPlayer";
import { HomeworkPlayChrome } from "@/components/primary/HomeworkPlayChrome";
import { HomeworkStartGate } from "@/components/primary/HomeworkStartGate";
import { HomeworkStudioActivityPlayer } from "@/components/primary/HomeworkStudioActivityPlayer";
import { SecondaryHomeworkOneShell } from "@/components/secondary/SecondaryHomeworkOneShell";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { CLASS_HOMEWORK_PAYLOAD_LABELS, type ClassHomeworkPayloadType } from "@/lib/class-homework/types";
import { parseStoredPackFlashcardCards } from "@/lib/class-homework/freeze-pack-flashcards";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { parseFrozenSecondaryHomeworkTemplateDocument } from "@/lib/class-homework/freeze-homework-template";
import { homeworkPortalPath, resolveHomeworkPortal } from "@/lib/class-homework/portal";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { SECONDARY_HOMEWORK_ONE } from "@/lib/homework-templates/secondary-homework-one";
import {
  getMyHomeworkTemplateSpeakingRecordings,
  getMyHomeworkTemplateSubmission,
} from "@/lib/data/homework-template-submissions";
import { getMyHomeworkWritingSubmission } from "@/lib/data/homework-writing-submissions";
import { getMyHomeworkCollectionAttempt } from "@/lib/data/homework-collection-attempts";
import { createClient } from "@/lib/supabase/server";
import { learningBandFromUser } from "@/lib/student-classes/portal-paths";
import { requireSecondaryStudentAccess } from "../../_lib/requireSecondaryAccess";

export const metadata: Metadata = {
  title: "Homework | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ homeworkId: string }>;
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function homeworkFrame(
  type: ClassHomeworkPayloadType,
): "standard" | "wide" {
  switch (type) {
    case "pack_quiz":
    case "pack_flashcards":
    case "word_pack_practice":
    case "external_note":
    case "writing_prompt":
      return "standard";
    default:
      return "wide";
  }
}

export default async function SecondaryHomeworkPage({ params }: Props) {
  const { homeworkId } = await params;
  const homeworkPath = `/secondary/homework/${encodeURIComponent(homeworkId)}`;
  await requireSecondaryStudentAccess({ next: homeworkPath });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?portal=student&next=${encodeURIComponent(homeworkPath)}`);
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  const detail = await getHomeworkForStudent(homeworkId);
  if (!detail) notFound();

  const { homework, quizQuestions } = detail;
  const payload = homework.payload;
  if (resolveHomeworkPortal(payload, learningBandFromUser(user)) === "primary") {
    redirect(homeworkPortalPath(homeworkId, "primary"));
  }
  const needsTemplateSubmission =
    (payload.type === "homework_template" &&
      payload.templateId === "secondary-homework-template-one") ||
    (payload.type === "graded_track" && payload.level === "secondary");
  const needsWritingSubmission = payload.type === "writing_prompt";
  const gradedFreeze = payload.type === "graded_track"
    ? parseGradedTrackFreezeDocument(payload.document)
    : null;
  const [templateSubmission, templateRecordings, writingSubmission, collectionAttempt] = await Promise.all([
    needsTemplateSubmission ? getMyHomeworkTemplateSubmission(homework.id) : Promise.resolve(null),
    needsTemplateSubmission ? getMyHomeworkTemplateSpeakingRecordings(homework.id) : Promise.resolve([]),
    needsWritingSubmission ? getMyHomeworkWritingSubmission(homework.id) : Promise.resolve(null),
    gradedFreeze?.collectionDocument ? getMyHomeworkCollectionAttempt(homework.id) : Promise.resolve(null),
  ]);
  const flashcardCards =
    payload.type === "pack_flashcards"
      ? parseStoredPackFlashcardCards(payload.cards ?? [])
      : [];
  const typeLabel = CLASS_HOMEWORK_PAYLOAD_LABELS[payload.type];
  const eyebrow = `${homework.classTitle} · ${typeLabel}`;

  return (
    <HomeworkPlayChrome
      title={homework.title}
      eyebrow={eyebrow}
      dueLabel={formatDue(homework.dueAt)}
      instructions={homework.instructions || null}
      closed={homework.status === "closed"}
      homeHref="/secondary"
      frame={homeworkFrame(payload.type)}
    >
      <HomeworkStartGate
        typeLabel={typeLabel}
        alreadyCompleted={Boolean(homework.completedAt)}
      >
      {payload.type === "external_note" ? (
        <div className="rounded-xl border-2 border-neutral-800 bg-white px-4 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-600">
            Teacher note
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-neutral-900">
            {payload.body}
          </p>
          <Link
            href="/secondary"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 px-5 text-sm font-extrabold text-white"
          >
            Back to Secondary home
          </Link>
        </div>
      ) : null}

      {payload.type === "writing_prompt" ? (
        <HomeworkWritingPromptPlayer
          homeworkId={homework.id}
          prompt={payload.prompt}
          payloadInstructions={payload.instructions}
          minWords={payload.minWords}
          alreadyCompleted={Boolean(homework.completedAt)}
          initialSubmission={writingSubmission}
          homeHref="/secondary"
          homeLabel="Back to Secondary home"
        />
      ) : null}

      {payload.type === "word_pack_practice" ? (
        <div className="rounded-xl border-2 border-neutral-800 bg-white px-4 py-5">
          <h2 className="text-lg font-extrabold text-neutral-900">{payload.packTitle}</h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600">
            Practice {payload.wordCount} word{payload.wordCount === 1 ? "" : "s"} from this pack on
            the Secondary daily path.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/secondary"
              className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 px-5 text-sm font-extrabold text-white"
            >
              Back to Secondary home
            </Link>
          </div>
        </div>
      ) : null}

      {payload.type === "pack_quiz" ? (
        quizQuestions && quizQuestions.length > 0 ? (
          <HomeworkPackQuizPlayer
            homeworkId={homework.id}
            title={payload.quizTitle}
            questions={quizQuestions}
            alreadyCompleted={Boolean(homework.completedAt)}
          />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-neutral-400 bg-white px-4 py-5 text-sm font-semibold text-neutral-600">
            Quiz content is not available yet. Ask your teacher to check the pack quiz.
          </p>
        )
      ) : null}

      {payload.type === "pack_flashcards" ? (
        flashcardCards.length > 0 ? (
          <HomeworkFlashcardsPlayer
            homeworkId={homework.id}
            title={payload.setTitle}
            cards={flashcardCards}
            alreadyCompleted={Boolean(homework.completedAt)}
          />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-neutral-400 bg-white px-4 py-5 text-sm font-semibold text-neutral-600">
            Flashcard content is not available yet. Ask your teacher to check the set.
          </p>
        )
      ) : null}

      {payload.type === "studio_activity" ? (
        <HomeworkStudioActivityPlayer
          homeworkId={homework.id}
          activityId={payload.activityId}
          format={payload.format}
          title={payload.title}
          pack={payload.pack}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "homework_template" && payload.templateId === "secondary-homework-template-one" ? (
        <SecondaryHomeworkOneShell
          homeworkId={homework.id}
          alreadyCompleted={Boolean(homework.completedAt)}
          homeHref="/secondary"
          initialSubmission={templateSubmission}
          initialRecording={templateRecordings[0]}
          content={
            payload.document
              ? (parseFrozenSecondaryHomeworkTemplateDocument(payload.document) ?? undefined)
              : undefined
          }
        />
      ) : null}

      {payload.type === "graded_track" && payload.level === "secondary" ? (
        (() => {
          const freeze = gradedFreeze;
          const content = freeze?.secondaryDocument as
            | typeof SECONDARY_HOMEWORK_ONE
            | undefined;
          return content || freeze?.collectionDocument ? (
            <div className="space-y-6">
              {content ? (
                <SecondaryHomeworkOneShell
                  homeworkId={homework.id}
                  alreadyCompleted={Boolean(homework.completedAt)}
                  homeHref="/secondary"
                  initialSubmission={templateSubmission}
                  initialRecording={templateRecordings[0]}
                  initialRecordings={templateRecordings}
                  content={content}
                  partInstances={freeze?.secondaryParts}
                  visiblePartIds={freeze?.parts.map((part) => part.sectionId)}
                  partLabels={
                    freeze
                      ? Object.fromEntries(
                          freeze.parts.map((part) => [part.sectionId, part.label]),
                        )
                      : undefined
                  }
                  title={freeze?.title}
                  subtitle={freeze?.instructions || undefined}
                  deferOverallCompletion={Boolean(freeze?.collectionDocument)}
                />
              ) : null}
              {freeze?.collectionDocument ? (
                <div className={content ? "border-t-4 border-dashed border-teal-200 pt-6" : ""}>
                  {content ? (
                    <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-teal-800">
                      Collection activities
                    </p>
                  ) : null}
                  <HomeworkCollectionPlayer
                    homeworkId={homework.id}
                    document={freeze.collectionDocument}
                    initialAttempt={collectionAttempt}
                    alreadyCompleted={Boolean(homework.completedAt)}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border-2 border-dashed border-neutral-400 bg-white px-4 py-5 text-sm font-semibold text-neutral-600">
              Graded track content is missing. Ask your teacher to re-assign this homework.
            </p>
          );
        })()
      ) : null}
      </HomeworkStartGate>
    </HomeworkPlayChrome>
  );
}

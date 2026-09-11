import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkWritingPromptPlayer } from "@/components/homework/HomeworkWritingPromptPlayer";
import { GradedTrackPlayer } from "@/components/homework/GradedTrackPlayer";
import { HomeworkFlashcardsPlayer } from "@/components/primary/HomeworkFlashcardsPlayer";
import { HomeworkPackQuizPlayer } from "@/components/primary/HomeworkPackQuizPlayer";
import { HomeworkPlayChrome } from "@/components/primary/HomeworkPlayChrome";
import { HomeworkStartGate } from "@/components/primary/HomeworkStartGate";
import { HomeworkStudioActivityPlayer } from "@/components/primary/HomeworkStudioActivityPlayer";
import { HomeworkPictureClozePlayer } from "@/components/primary/HomeworkPictureClozePlayer";
import { HomeworkVerbTablePlayer } from "@/components/primary/HomeworkVerbTablePlayer";
import { HomeworkSentenceColumnsPlayer } from "@/components/primary/HomeworkSentenceColumnsPlayer";
import { HomeworkWordAnnotationPlayer } from "@/components/primary/HomeworkWordAnnotationPlayer";
import { HomeworkPictureWritingPlayer } from "@/components/primary/HomeworkPictureWritingPlayer";
import { HomeworkQuestionWritingPlayer } from "@/components/primary/HomeworkQuestionWritingPlayer";
import { HomeworkDefinitionMatchPlayer } from "@/components/primary/HomeworkDefinitionMatchPlayer";
import { HomeworkClozeChoicePlayer } from "@/components/primary/HomeworkClozeChoicePlayer";
import { HomeworkClozeOpenPlayer } from "@/components/primary/HomeworkClozeOpenPlayer";
import { HomeworkReadAndAnswerPlayer } from "@/components/primary/HomeworkReadAndAnswerPlayer";
import { HomeworkPictureStoryPlayer } from "@/components/primary/HomeworkPictureStoryPlayer";
import { HomeworkTemplateOnePilot } from "@/components/pilots/HomeworkTemplateOnePilot";
import { PrimaryA2AssessmentPilot } from "@/components/assessment/PrimaryA2AssessmentPilot";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { CLASS_HOMEWORK_PAYLOAD_LABELS, type ClassHomeworkPayloadType } from "@/lib/class-homework/types";
import { parseStoredPackFlashcardCards } from "@/lib/class-homework/freeze-pack-flashcards";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { parseFrozenPrimaryHomeworkTemplateDocument } from "@/lib/class-homework/freeze-homework-template";
import { homeworkPortalPath, resolveHomeworkPortal } from "@/lib/class-homework/portal";
import { resolveHomeworkAssessmentDefinition } from "@/lib/class-homework/resolve-assessment-definition";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { getMyAssessmentAttempt, getMyAssessmentSpeakingRecordings, getMyAssessmentSpeakingReview } from "@/lib/data/assessment-attempts";
import { getMyHomeworkWritingSubmission } from "@/lib/data/homework-writing-submissions";
import { getMyHomeworkCollectionAttempt } from "@/lib/data/homework-collection-attempts";
import { getMyHomeworkCollectionSpeakingRecordings } from "@/lib/data/homework-collection-speaking-recordings";
import { getMyHomeworkTemplateSubmission } from "@/lib/data/homework-template-submissions";
import { createClient } from "@/lib/supabase/server";
import { learningBandFromUser } from "@/lib/student-classes/portal-paths";

/**
 * Product C — teacher homework (pack quiz / flashcards / notes / Activity Bank).
 * F2: focused play chrome + progress + finish → Home.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */

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

export default async function PrimaryHomeworkPage({ params }: Props) {
  const { homeworkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/primary/homework/${encodeURIComponent(homeworkId)}`;
    redirect(studentLoginPath("a1", next));
  }
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  const detail = await getHomeworkForStudent(homeworkId);
  if (!detail) notFound();

  const { homework, quizQuestions } = detail;
  const payload = homework.payload;
  if (resolveHomeworkPortal(payload, learningBandFromUser(user)) === "secondary") {
    redirect(homeworkPortalPath(homeworkId, "secondary"));
  }
  if (payload.type === "primary_a2_assessment") {
    const [initialAttempt, initialSpeakingRecordings, speakingReview] = await Promise.all([
      getMyAssessmentAttempt(homework.id),
      getMyAssessmentSpeakingRecordings(homework.id),
      getMyAssessmentSpeakingReview(homework.id),
    ]);
    return (
      <PrimaryA2AssessmentPilot
        homeworkId={homework.id}
        definition={resolveHomeworkAssessmentDefinition(payload)}
        initialAttempt={initialAttempt}
        initialSpeakingRecordings={initialSpeakingRecordings}
        speakingReview={speakingReview}
      />
    );
  }
  const flashcardCards =
    payload.type === "pack_flashcards"
      ? parseStoredPackFlashcardCards(payload.cards ?? [])
      : [];
  const writingSubmission =
    payload.type === "writing_prompt"
      ? await getMyHomeworkWritingSubmission(homework.id)
      : null;
  const gradedFreeze =
    payload.type === "graded_track"
      ? parseGradedTrackFreezeDocument(payload.document)
      : null;
  const [collectionAttempt, templateSubmission, collectionSpeakingRecordings] =
    await Promise.all([
      gradedFreeze?.collectionDocument
        ? getMyHomeworkCollectionAttempt(homework.id)
        : Promise.resolve(null),
      gradedFreeze?.primaryDocument
        ? getMyHomeworkTemplateSubmission(homework.id)
        : Promise.resolve(null),
      gradedFreeze?.collectionDocument
        ? getMyHomeworkCollectionSpeakingRecordings(homework.id)
        : Promise.resolve([]),
    ]);
  const typeLabel = CLASS_HOMEWORK_PAYLOAD_LABELS[payload.type];
  const eyebrow = `${homework.classTitle} · ${typeLabel}`;

  return (
    <HomeworkPlayChrome
      title={homework.title}
      eyebrow={eyebrow}
      dueLabel={formatDue(homework.dueAt)}
      instructions={homework.instructions || null}
      closed={homework.status === "closed"}
      frame={homeworkFrame(payload.type)}
      showContext={payload.type !== "homework_template"}
    >
      <HomeworkStartGate
        typeLabel={typeLabel}
        alreadyCompleted={Boolean(homework.completedAt)}
      >
      {payload.type === "external_note" ? (
        <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 shadow-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--pl-muted)]">
            Teacher note
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-[var(--pl-ink)]">
            {payload.body}
          </p>
          <Link
            href="/primary"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
          >
            Back to Home
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
        />
      ) : null}

      {payload.type === "word_pack_practice" ? (
        <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[var(--pl-ink)]">{payload.packTitle}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
            Practice {payload.wordCount} word{payload.wordCount === 1 ? "" : "s"} from this pack in
            Learn.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/primary?nav=vocabulary"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
            >
              Open Learn
            </Link>
            <Link
              href="/primary"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-5 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)]"
            >
              Back to Home
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
          <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
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
          <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
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

      {payload.type === "picture_cloze" ? (
        <HomeworkPictureClozePlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "verb_table" ? (
        <HomeworkVerbTablePlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "sentence_columns" ? (
        <HomeworkSentenceColumnsPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "word_annotation" ? (
        <HomeworkWordAnnotationPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "picture_writing" ? (
        <HomeworkPictureWritingPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "question_writing" ? (
        <HomeworkQuestionWritingPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "definition_match" ? (
        <HomeworkDefinitionMatchPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "cloze_choice" ? (
        <HomeworkClozeChoicePlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "cloze_open" ? (
        <HomeworkClozeOpenPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "read_and_answer" ? (
        <HomeworkReadAndAnswerPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "picture_story" ? (
        <HomeworkPictureStoryPlayer
          homeworkId={homework.id}
          title={payload.title}
          document={payload.document}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}

      {payload.type === "homework_template" && payload.templateId === "homework-template-one" ? (
        <HomeworkTemplateOnePilot
          homeworkId={homework.id}
          alreadyCompleted={Boolean(homework.completedAt)}
          document={
            payload.document
              ? (parseFrozenPrimaryHomeworkTemplateDocument(payload.document) ?? undefined)
              : undefined
          }
        />
      ) : null}

      {payload.type === "graded_track" && payload.level === "primary" && gradedFreeze ? (
        <GradedTrackPlayer
          freeze={gradedFreeze}
          homeworkId={homework.id}
          alreadyCompleted={Boolean(homework.completedAt)}
          initialCollectionAttempt={collectionAttempt}
          initialTemplateSubmission={templateSubmission}
          initialSpeakingRecordings={collectionSpeakingRecordings}
          homeHref="/primary"
        />
      ) : null}
      </HomeworkStartGate>
    </HomeworkPlayChrome>
  );
}

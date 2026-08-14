"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PictureClozePlayer } from "@/components/picture-cloze/PictureClozePlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordPictureClozeHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  toPictureClozePlayable,
  validatePictureClozeDocument,
} from "@/lib/picture-cloze";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
  homeHref?: string;
};

export function HomeworkPictureClozePlayer({
  homeworkId,
  title,
  document: rawDocument,
  alreadyCompleted,
  homeHref = "/primary",
}: Props) {
  const router = useRouter();
  const [finished, setFinished] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);

  const view = useMemo(() => {
    try {
      const document = validatePictureClozeDocument(rawDocument);
      return {
        activity: toPictureClozePlayable(document),
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        error:
          error instanceof Error ? error.message : "Could not open this picture cloze.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordPictureClozeHomeworkCompletion({ homeworkId }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        recordedRef.current = false;
        setSaveError(result.error);
        return;
      }
      setCompletedAt(result.finishedAt);
      if (result.rewardReceipt) acceptPrimaryRewardReceipt(result.rewardReceipt);
      router.push(homeHref);
    });
  }, [finished, homeworkId, homeHref, router]);

  if (view.error || !view.activity) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
        {view.error || "Picture cloze content is not available."}
      </p>
    );
  }

  if ((finished || completedAt) && saveError) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.activity.items.length} picture${
          view.activity.items.length === 1 ? "" : "s"
        }).`}
        saving={saving}
        saved={false}
        saveError={saveError}
        retryLabel="Try again"
        primaryHref={homeHref}
        primaryLabel="Done"
        onRetry={() => {
          setFinished(false);
          setSaveError(null);
        }}
      />
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title}. Heading back home…`}
        saving={saving || Boolean(finished && !completedAt)}
        saved={Boolean(completedAt)}
        saveError={null}
        retryLabel="Stay here"
        primaryHref={homeHref}
        primaryLabel="Done"
        onRetry={() => {
          setFinished(false);
        }}
      />
    );
  }

  return (
    <PictureClozePlayer
      activity={view.activity}
      eyebrow="Homework · Picture cloze"
      doneLabel="Done"
      onMastered={() => setFinished(true)}
    />
  );
}

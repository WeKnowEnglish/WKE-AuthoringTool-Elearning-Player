"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  visibleActivityBuilderSections,
  type ActivityBuilderCard,
} from "@/lib/activity-builder/catalog";
import { adminTeacherPreviewStore } from "@/lib/admin-teacher-preview";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

type Props = {
  studioOrigin: string | null;
  /** Platform admins see Studio-interim / unshipped formats (unless previewing Light). */
  isAdmin?: boolean;
};

function statusLabel(card: ActivityBuilderCard): string {
  if (card.status === "authoring_ready") return "Open in Lesson Player";
  if (card.status === "play_in_bank") return "Play in Activity Bank";
  if (card.status === "studio_interim") return "Author in EDU Studio";
  return "Authoring soon";
}

function ActivityCard({
  card,
  studioOrigin,
}: {
  card: ActivityBuilderCard;
  studioOrigin: string | null;
}) {
  const studioHref =
    studioOrigin && card.studioPath
      ? `${studioOrigin}${card.studioPath}`
      : null;
  const lpHref = card.lpPath
    ? `/teacher/activity-builder${card.lpPath}`
    : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          {card.badge}
        </span>
        <span className="shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
          {statusLabel(card)}
        </span>
      </div>
      <h3 className="mt-1 text-sm font-semibold leading-snug text-stone-900">
        {card.title}
      </h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-stone-600">
        {card.description}
      </p>
      {!studioHref && !lpHref ? (
        <p className="mt-2 text-[11px] text-stone-500">
          Workspace ports in a later phase.
        </p>
      ) : null}
      {card.status === "authoring_ready" ? (
        <p className="mt-2 text-[11px] text-emerald-800">
          {card.lpPath === "/vocabulary-lists" && card.bankFormats?.length
            ? "Compile from Vocabulary lists in Lesson Player."
            : card.lpPath === "/quizzes"
              ? "Generate from a list, edit questions, save to Activity Bank."
            : card.lpPath === "/hotspots"
              ? "Author here, save to Activity Bank, use in the track compiler."
              : "Authoring lives in Lesson Player."}
        </p>
      ) : null}
      {card.status === "play_in_bank" && !lpHref ? (
        <p className="mt-2 text-[11px] text-emerald-800">
          Published packs play from My Activity Bank. Authoring still opens in
          Studio for now.
        </p>
      ) : null}
    </>
  );

  const cardClass =
    "flex h-full min-h-0 flex-col rounded-xl border border-stone-200 bg-white/80 px-3 py-2.5 transition hover:border-stone-400 hover:bg-white";

  if (lpHref) {
    return (
      <Link href={lpHref} className={cardClass}>
        {body}
      </Link>
    );
  }

  if (studioHref) {
    return (
      <a
        href={studioHref}
        target="_blank"
        rel="noreferrer"
        className={cardClass}
      >
        {body}
        <span className="mt-2 text-[11px] font-medium text-sky-800">
          Open in EDU Studio →
        </span>
      </a>
    );
  }

  return <div className={`${cardClass} opacity-80`}>{body}</div>;
}

function SectionLabel({
  children,
  toneClass,
}: {
  children: ReactNode;
  toneClass: string;
}) {
  return (
    <h2
      className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </h2>
  );
}

/** Landing menu for Activity Builder (LP-native tools + Studio interim cards). */
export function ActivityBuilderHub({
  studioOrigin,
  isAdmin = false,
}: Props) {
  const previewAsTeacherLight = useSyncExternalStore(
    adminTeacherPreviewStore.subscribe,
    adminTeacherPreviewStore.getSnapshot,
    adminTeacherPreviewStore.getServerSnapshot,
  );
  const effectiveIsAdmin = isAdmin && !previewAsTeacherLight;
  const sections = useMemo(
    () => visibleActivityBuilderSections(effectiveIsAdmin),
    [effectiveIsAdmin],
  );

  useEffect(() => {
    recordAppDiagnostic("teacher", "mark", "activity_builder_hub_loaded");
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">
            Activity Builder
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Build activities for your Activity Bank and Classroom Wall.
            Vocabulary lists, Explore hotspots, and the Learning Track Compiler
            author here
            {effectiveIsAdmin
              ? "; some scene/quiz tools still open in EDU Studio."
              : "."}
          </p>
        </div>
        <Link
          href="/teacher/classes?bank=1"
          className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 sm:text-sm"
        >
          My Activity Bank
        </Link>
      </header>

      {effectiveIsAdmin && !studioOrigin ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Set <code className="font-mono">NEXT_PUBLIC_STUDIO_ORIGIN</code> to
          enable “Open in EDU Studio” links for tools that are still interim.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <section key={section.id}>
            <SectionLabel toneClass={section.toneClass}>
              {section.label}
            </SectionLabel>
            <div
              className={
                section.id === "compiler"
                  ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              }
            >
              {section.cards.map((card) => (
                <ActivityCard
                  key={card.id}
                  card={card}
                  studioOrigin={studioOrigin}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

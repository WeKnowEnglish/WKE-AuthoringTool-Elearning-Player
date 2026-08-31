"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Copy,
  FilePenLine,
  ImageIcon,
  Layers3,
  LifeBuoy,
  ListChecks,
  Palette,
  Plus,
  Settings2,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  activityCountLabel,
  activityItemNoun,
  trackMediaIssues,
  trackScoringParts,
  type ActivityTrackDocument,
  type ActivityTrackPart,
} from "@/lib/activity-tracks";
import { homeworkCollectionPartValidationIssues } from "@/lib/homework-collections";

export type GradedAuthoringSelection =
  | { type: "track" }
  | { type: "part"; partId: string };

export type GradedAuthoringStep =
  | "track-setup"
  | "track-activities"
  | "track-support"
  | "track-media"
  | "track-points"
  | "track-design"
  | "track-review"
  | "part-setup"
  | "part-content"
  | "part-review";

export type GradedTrackStep = Extract<GradedAuthoringStep, `track-${string}`>;
export type GradedPartStep = Extract<GradedAuthoringStep, `part-${string}`>;

type Props = {
  document: ActivityTrackDocument;
  selection: GradedAuthoringSelection;
  step: GradedAuthoringStep;
  onSelectTrack: (step: GradedTrackStep) => void;
  onSelectPart: (partId: string, step: GradedPartStep) => void;
  onAddPart: () => void;
  onMovePart: (partId: string, direction: -1 | 1) => void;
  onDuplicatePart: (partId: string) => void;
  onRemovePart: (partId: string) => void;
};

type Branch = {
  step: GradedTrackStep;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  ready: boolean;
  warning?: boolean;
};

function partReady(part: ActivityTrackPart): boolean {
  if (part.source.type === "empty") return false;
  if (part.source.type === "template_section") return Boolean(part.label.trim());
  return homeworkCollectionPartValidationIssues(part.source.part).length === 0;
}

function StatusIcon({ ready, warning }: { ready: boolean; warning?: boolean }) {
  if (ready) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300 text-emerald-950">
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
    );
  }
  if (warning) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-amber-950">
        <AlertTriangle className="h-3 w-3" />
      </span>
    );
  }
  return <Circle className="h-4 w-4 text-white/45" />;
}

export function GradedTrackAuthoringTree({
  document,
  selection,
  step,
  onSelectTrack,
  onSelectPart,
  onAddPart,
  onMovePart,
  onDuplicatePart,
  onRemovePart,
}: Props) {
  const selectedPart =
    selection.type === "part"
      ? document.parts.find((part) => part.id === selection.partId) ?? null
      : null;
  const selectedIndex = selectedPart
    ? document.parts.findIndex((part) => part.id === selectedPart.id)
    : -1;
  const activitiesReady =
    document.parts.length > 0 && document.parts.every(partReady);
  const mediaIssues = trackMediaIssues(document);
  const scoring = trackScoringParts(document);
  const scoreTotal = scoring.reduce((sum, part) => sum + part.maxScore, 0);

  const branches: Branch[] = [
    {
      step: "track-setup",
      label: "Track Setup",
      icon: Settings2,
      activeClass: "bg-teal-300 text-teal-950",
      ready: Boolean(document.title.trim() && document.level),
    },
    {
      step: "track-activities",
      label: `Activities · ${document.parts.length}`,
      icon: Layers3,
      activeClass: "bg-sky-300 text-sky-950",
      ready: activitiesReady,
      warning: document.parts.length > 0 && !activitiesReady,
    },
    {
      step: "track-support",
      label: "Support",
      icon: LifeBuoy,
      activeClass: "bg-cyan-200 text-cyan-950",
      ready: Boolean(document.instructions.trim()),
    },
    {
      step: "track-media",
      label: "Media",
      icon: ImageIcon,
      activeClass: "bg-indigo-200 text-indigo-950",
      ready: mediaIssues.length === 0,
      warning: mediaIssues.length > 0,
    },
    {
      step: "track-points",
      label: "Points & Rewards",
      icon: Trophy,
      activeClass: "bg-amber-200 text-amber-950",
      ready: scoreTotal > 0,
    },
    {
      step: "track-design",
      label: "Design",
      icon: Palette,
      activeClass: "bg-violet-200 text-violet-950",
      ready: true,
    },
    {
      step: "track-review",
      label: "Review & Assign",
      icon: ClipboardCheck,
      activeClass: "bg-emerald-300 text-emerald-950",
      ready:
        Boolean(document.title.trim()) &&
        activitiesReady &&
        mediaIssues.length === 0 &&
        scoreTotal > 0,
    },
  ];

  return (
    <nav aria-label="Learning Track authoring branches" className="min-w-0">
      <div className="mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-200">
          Learning Track
        </p>
        <p className="mt-1 text-sm font-extrabold text-white">Authoring workflow</p>
      </div>

      <ol className="space-y-1">
        {branches.map((branch, index) => {
          const active =
            step === branch.step ||
            (branch.step === "track-activities" && step.startsWith("part-"));
          const Icon = branch.icon;
          return (
            <li key={branch.step}>
              <button
                type="button"
                onClick={() => onSelectTrack(branch.step)}
                aria-current={active ? "step" : undefined}
                className={
                  "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition " +
                  (active
                    ? branch.activeClass
                    : "text-white hover:bg-white/10")
                }
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15 text-[10px] font-black">
                  {active ? <Icon className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold">
                  {branch.label}
                </span>
                <StatusIcon ready={branch.ready} warning={branch.warning} />
              </button>

              {branch.step === "track-activities" && active && selectedPart ? (
                <div className="my-2 ml-3 border-l border-sky-200/40 pl-2">
                  <button
                    type="button"
                    onClick={() => onSelectTrack("track-activities")}
                    className="mb-2 inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-sky-100 underline"
                  >
                    <ChevronLeft className="h-3 w-3" /> All activities
                  </button>
                  <div className="rounded-lg border border-sky-200/30 bg-sky-950/55 p-2">
                    <p className="truncate text-[11px] font-extrabold text-white">
                      {selectedPart.label}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-200">
                      Activity {selectedIndex + 1} · {activityCountLabel(selectedPart)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {(
                        [
                          ["part-setup", "Setup & options", FilePenLine],
                          [
                            "part-content",
                            `${activityItemNoun(selectedPart).replace(/^./, (letter) => letter.toUpperCase())}s`,
                            ListChecks,
                          ],
                          ["part-review", "Answers & review", ClipboardCheck],
                        ] as const
                      ).map(([partStep, label, PartIcon]) => (
                        <button
                          key={partStep}
                          type="button"
                          onClick={() => onSelectPart(selectedPart.id, partStep)}
                          className={
                            "flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[10px] font-bold " +
                            (step === partStep
                              ? "bg-white text-sky-950"
                              : "text-sky-100 hover:bg-white/10")
                          }
                        >
                          <PartIcon className="h-3.5 w-3.5" /> {label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-0.5 border-t border-white/10 pt-1">
                      <button
                        type="button"
                        disabled={selectedIndex === 0}
                        onClick={() => onMovePart(selectedPart.id, -1)}
                        aria-label={`Move ${selectedPart.label} earlier`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-sky-100 hover:bg-white/10 disabled:opacity-25"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={selectedIndex >= document.parts.length - 1}
                        onClick={() => onMovePart(selectedPart.id, 1)}
                        aria-label={`Move ${selectedPart.label} later`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-sky-100 hover:bg-white/10 disabled:opacity-25"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicatePart(selectedPart.id)}
                        aria-label={`Duplicate ${selectedPart.label}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-sky-100 hover:bg-white/10"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={document.parts.length <= 1}
                        onClick={() => onRemovePart(selectedPart.id)}
                        aria-label={`Remove ${selectedPart.label}`}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-rose-200 hover:bg-rose-400/15 disabled:opacity-25"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {branch.step === "track-activities" && active ? (
                <button
                  type="button"
                  onClick={onAddPart}
                  className="mt-1 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-200/50 bg-sky-400/10 px-2 text-[10px] font-extrabold text-sky-100 hover:bg-sky-400/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Add activity
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

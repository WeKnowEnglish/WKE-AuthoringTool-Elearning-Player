import type { LandingIconName } from "@/lib/landing/landing-icons";
import type { LandingTrackBand } from "@/lib/learning-band";

export type LandingPathVariant = "primary" | "secondary";

export type LandingPathConfig = {
  band: LandingTrackBand;
  variant: LandingPathVariant;
  title: string;
  description: string;
  meta: { icon: LandingIconName; label: string }[];
  pills: { label: string; icon: LandingIconName; tone: string }[];
  ctaLabel: string;
};

export const LANDING_PATHS: LandingPathConfig[] = [
  {
    band: "a1",
    variant: "primary",
    title: "Primary Learners",
    description: "Games, stories, phonics, and vocabulary practice.",
    meta: [
      { icon: "graduation", label: "Grades 1–5" },
      { icon: "level", label: "Pre-A1 to A2" },
    ],
    pills: [
      { label: "Phonics", icon: "music", tone: "bg-amber-100 text-amber-800" },
      { label: "Words", icon: "book", tone: "bg-emerald-100 text-emerald-800" },
      { label: "Stories", icon: "story", tone: "bg-pink-100 text-pink-800" },
      { label: "Games", icon: "game", tone: "bg-violet-100 text-violet-800" },
    ],
    ctaLabel: "Enter Primary",
  },
  {
    band: "a2",
    variant: "secondary",
    title: "Secondary Learners",
    description: "Smart practice, grammar tools, quests, and skill tracking.",
    meta: [
      { icon: "graduation", label: "Grades 6–9" },
      { icon: "level", label: "A1 to B1" },
    ],
    pills: [
      { label: "Vocabulary", icon: "book", tone: "bg-blue-100 text-blue-800" },
      { label: "Grammar", icon: "pencil", tone: "bg-sky-100 text-sky-800" },
      { label: "Skills", icon: "target", tone: "bg-indigo-100 text-indigo-800" },
      { label: "Quests", icon: "compass", tone: "bg-cyan-100 text-cyan-800" },
    ],
    ctaLabel: "Enter Secondary",
  },
];

export const LANDING_FEATURES = [
  {
    icon: "brain" as const,
    title: "Smart practice",
    body: "Adaptive activities for each learner.",
    accent: "text-violet-500",
  },
  {
    icon: "trophy" as const,
    title: "Student progress",
    body: "Track skills, badges, and growth.",
    accent: "text-amber-500",
  },
  {
    icon: "users" as const,
    title: "Teacher tools",
    body: "Assign, monitor, and support students.",
    accent: "text-blue-500",
  },
] as const;

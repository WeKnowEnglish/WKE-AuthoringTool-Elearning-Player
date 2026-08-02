"use client";

import Image from "next/image";
import { Lightbulb } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SITE_NAME } from "@/lib/seo/site";

/**
 * How-it-works scenes — step copy mapped for SEO.
 * Create → classroom · Teach → live online · Assign (+ Play) → student practice · Review → family report.
 */
export const HOW_IT_WORKS_NODES = [
  {
    id: "create",
    step: 1,
    title: "Create",
    body: "Build quizzes, lessons, and learning tracks once — then reuse them across class and home.",
    alt: "Create ESL lessons on the We Know English classroom wall while teaching students in class",
    src: "/landing/how-it-works-classroom.png",
  },
  {
    id: "teach",
    step: 2,
    title: "Teach",
    body: "Run live lessons with the same activities, whiteboards, and classroom participation tools.",
    alt: "Teach English online with We Know English live lessons, activities, and video class tools",
    src: "/landing/how-it-works-teach-online.png",
  },
  {
    id: "assign",
    step: 3,
    title: "Assign",
    body: "Send homework and learning paths to rostered students without leaving the platform. Students practise through games, quests, and interactive activities.",
    alt: "Assign ESL homework and learning paths so students can practise English at home with We Know English games and activities",
    src: "/landing/how-it-works-learn-online.png",
  },
  {
    id: "review",
    step: 4,
    title: "Review",
    body: "See progress and mastery evidence so you know what to teach next — and share meaningful reports with families.",
    alt: "Review student progress and mastery on We Know English and share reports with parents",
    src: "/landing/how-it-works-family-progress.png",
  },
] as const;

function BrandHub() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-1.5 text-center sm:gap-2"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3dd] sm:h-16 sm:w-16"
        aria-hidden
      >
        <Lightbulb
          className="h-7 w-7 text-[var(--landing-primary-title)] sm:h-8 sm:w-8"
          strokeWidth={2.25}
          fill="currentColor"
          fillOpacity={0.18}
        />
      </div>
      <p className="text-base font-extrabold leading-tight text-kid-ink sm:text-lg">
        {SITE_NAME}
      </p>
    </motion.div>
  );
}

function MindMapNode({
  step,
  title,
  body,
  alt,
  src,
  index,
}: {
  step: number;
  title: string;
  body: string;
  alt: string;
  src: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const delay = index * 0.1;

  return (
    <figure className="mx-auto flex w-full max-w-[13rem] flex-col items-center gap-2 sm:max-w-[15rem] lg:max-w-[16rem]">
      <motion.div
        className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-kid-ink/25 bg-[#fff8ec] shadow-[3px_3px_0_0_rgba(15,23,42,0.08)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.72, y: 18 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{
          duration: 0.5,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 46vw, 256px"
          className="object-cover object-center"
        />
      </motion.div>
      <motion.figcaption
        className="text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{
          duration: 0.4,
          delay: delay + 0.14,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
          Step {step}
        </p>
        <p className="text-sm font-extrabold text-kid-ink sm:text-base">{title}</p>
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[var(--landing-body-muted)] sm:text-xs">
          {body}
        </p>
      </motion.figcaption>
    </figure>
  );
}

/** How it works — brand hub on top, tight 2×2 scene grid below. */
export function LandingWorkflowSection() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="how-it-works-heading"
          className="text-2xl font-extrabold text-kid-ink sm:text-4xl"
        >
          How it works
        </h2>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
          One ESL ecosystem for teachers and learners: create content, teach
          live, assign practice, play through games, and review progress —
          without jumping between tools.
        </p>
      </div>

      <div className="mx-auto mt-7 flex max-w-3xl flex-col items-center sm:mt-9">
        <BrandHub />

        <ul className="mt-4 grid w-full grid-cols-2 gap-x-2 gap-y-4 sm:mt-5 sm:gap-x-3 sm:gap-y-5 lg:max-w-2xl lg:gap-x-4">
          {HOW_IT_WORKS_NODES.map((node, index) => (
            <li key={node.id}>
              <MindMapNode
                step={node.step}
                title={node.title}
                body={node.body}
                alt={node.alt}
                src={node.src}
                index={index}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

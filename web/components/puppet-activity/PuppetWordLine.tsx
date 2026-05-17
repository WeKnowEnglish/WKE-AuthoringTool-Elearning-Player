"use client";

import { clsx } from "clsx";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_WORD_STAGGER_MS, tokenizeLineForReveal } from "@/lib/puppet-activity/types";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 28 },
  },
};

type Props = {
  text: string;
  wordStaggerMs?: number;
  /** Increment to replay reveal animation for a new line. */
  lineKey: string;
  motionEnabled?: boolean;
  className?: string;
};

export function PuppetWordLine({
  text,
  wordStaggerMs,
  lineKey,
  motionEnabled = true,
  className,
}: Props) {
  const tokens = useMemo(() => tokenizeLineForReveal(text), [text]);
  const stagger = (wordStaggerMs ?? DEFAULT_WORD_STAGGER_MS) / 1000;
  const [visible, setVisible] = useState(!motionEnabled);

  useEffect(() => {
    if (!motionEnabled) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(t);
  }, [lineKey, motionEnabled]);

  const variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: stagger, delayChildren: 0.05 },
      },
    }),
    [stagger],
  );

  if (!motionEnabled) {
    return (
      <p
        className={clsx(
          "text-center text-2xl font-extrabold leading-snug text-kid-ink sm:text-3xl",
          className,
        )}
      >
        {text}
      </p>
    );
  }

  return (
    <motion.p
      key={lineKey}
      className={clsx(
        "flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center text-2xl font-extrabold leading-snug text-kid-ink sm:text-3xl",
        className,
      )}
      variants={visible ? variants : containerVariants}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      aria-live="polite"
    >
      {tokens.map((token, i) => (
        <motion.span key={`${lineKey}-${i}-${token}`} variants={wordVariants} className="inline-block">
          {token}
        </motion.span>
      ))}
    </motion.p>
  );
}

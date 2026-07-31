"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { PortalLoginModal } from "@/components/auth/PortalLoginModal";
import { playSfx } from "@/lib/audio/sfx";
import { LANDING_PATHS } from "@/lib/landing/landing-path-config";
import type { LandingTrackBand } from "@/lib/learning-band";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

const SECONDARY_LOGIN_PATH = "/secondary/login";

/**
 * Primary/Secondary path picker — compact side-by-side entry buttons.
 */
export function LandingPathPicker() {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);

  function enterTrack(band: LandingTrackBand) {
    playSfx("tap", getProgressSnapshot().audioMuted === true);
    if (band === "a2") {
      router.push(SECONDARY_LOGIN_PATH);
      return;
    }
    setLoginOpen(true);
  }

  return (
    <>
      <section
        aria-labelledby="learning-paths-heading"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:pb-12 sm:pt-2"
      >
        <h2
          id="learning-paths-heading"
          className="pt-1 text-center text-2xl font-extrabold text-kid-ink sm:text-3xl"
        >
          Learning Paths
        </h2>
        <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-5 sm:mt-6 sm:max-w-lg sm:gap-7">
          {LANDING_PATHS.map((path) => {
            const isPrimary = path.variant === "primary";
            const keywords = path.highlights;
            return (
              <div key={path.band} className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => enterTrack(path.band)}
                  className={clsx(
                    "inline-flex min-h-14 w-full items-center justify-center rounded-xl px-5 py-3.5",
                    "text-base font-extrabold text-white shadow-[3px_3px_0_0_var(--kid-shadow)] sm:min-h-16 sm:px-6 sm:py-4 sm:text-lg",
                    "[touch-action:manipulation] transition-transform hover:translate-y-px active:scale-[0.98]",
                    "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
                    "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
                    isPrimary ? "landing-cta-primary" : "landing-cta-secondary",
                  )}
                >
                  {path.ctaLabel}
                </button>
                <ul className="flex flex-col items-center gap-1 text-center">
                  {keywords.map((label) => (
                    <li
                      key={label}
                      className="text-xs font-semibold text-[var(--landing-body-muted)] sm:text-sm"
                    >
                      · {label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <PortalLoginModal
        open={loginOpen}
        learningBand="a1"
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}

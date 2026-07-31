"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortalLoginModal } from "@/components/auth/PortalLoginModal";
import { LandingPathCard } from "@/components/landing/LandingPathCard";
import { playSfx } from "@/lib/audio/sfx";
import { LANDING_PATHS } from "@/lib/landing/landing-path-config";
import type { LandingTrackBand } from "@/lib/learning-band";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

const SECONDARY_LOGIN_PATH = "/secondary/login";

/**
 * Primary/Secondary path picker — student entry under the homepage hero.
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
        <div className="mt-5 grid gap-4 overflow-visible sm:mt-6 md:grid-cols-2">
          {LANDING_PATHS.map((path) => (
            <LandingPathCard
              key={path.band}
              config={path}
              characterSrc={null}
              onEnter={() => enterTrack(path.band)}
            />
          ))}
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

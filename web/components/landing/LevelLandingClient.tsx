"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortalLoginModal } from "@/components/auth/PortalLoginModal";
import { LandingFeatureBar } from "@/components/landing/LandingFeatureBar";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPathCard } from "@/components/landing/LandingPathCard";
import { playSfx } from "@/lib/audio/sfx";
import { LANDING_CHARACTERS } from "@/lib/landing/landing-assets";
import { LANDING_PATHS } from "@/lib/landing/landing-path-config";
import type { LandingTrackBand } from "@/lib/learning-band";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

const SECONDARY_LOGIN_PATH = "/secondary/login";

export function LevelLandingClient() {
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
      <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
        <LandingHeader />
        <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-8">
          <LandingHero />
          <div className="grid gap-6 overflow-visible md:grid-cols-2 md:gap-4">
            {LANDING_PATHS.map((path) => (
              <LandingPathCard
                key={path.band}
                config={path}
                characterSrc={LANDING_CHARACTERS[path.variant]}
                onEnter={() => enterTrack(path.band)}
              />
            ))}
          </div>
          <LandingFeatureBar />
        </main>
      </div>

      <PortalLoginModal
        open={loginOpen}
        learningBand="a1"
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}

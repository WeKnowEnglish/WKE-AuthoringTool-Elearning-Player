import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomepageAnalytics } from "@/components/landing/HomepageAnalytics";
import { ConnectedClassroomHeroPilot } from "@/components/pilots/ConnectedClassroomHeroPilot";
import { LandingAudiencePathways } from "@/components/landing/LandingAudiencePathways";
import { LandingExpertiseSection } from "@/components/landing/LandingExpertiseSection";
import { LandingFreeActivitiesSection } from "@/components/landing/LandingFreeActivitiesSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPathPicker } from "@/components/landing/LandingPathPicker";
import { LandingTeachersSection } from "@/components/landing/LandingTeachersSection";
import { LandingWorkflowSection } from "@/components/landing/LandingWorkflowSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import {
  resolveLandingRedirectPath,
  shouldSkipLevelLanding,
} from "@/lib/landing/should-skip-landing";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";

const description =
  "An all-in-one ESL platform for teachers, students and parents. Create lessons, teach online, assign practice, play learning games, and track progress.";

const organizationDescription =
  "We Know English is a connected ESL teaching and learning platform for creating lessons, running online classes, assigning practice, supporting independent learning, and tracking student progress.";

export const metadata: Metadata = buildPublicMetadata({
  title: "All-in-One ESL Teaching Platform",
  description,
  pathname: "/",
  openGraphTitle: "We Know English — Connected ESL Teaching and Learning",
  openGraphImage: "/landing/primary-mascot.png",
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "We Know English Online",
      url: SITE_URL,
      description: organizationDescription,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "We Know English Online",
      description,
      inLanguage: "en",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default async function LevelLandingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (shouldSkipLevelLanding({ isAuthenticated: Boolean(user) })) {
    const path = resolveLandingRedirectPath(user);

    if (path) {
      redirect(path);
    }

    redirect("/login");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomepageAnalytics />
      <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
        <LandingHeader />
        <main>
          <LandingHero />
          <ConnectedClassroomHeroPilot embedded />
          <LandingPathPicker />
          <LandingWorkflowSection />
          <LandingTeachersSection />
          <LandingFreeActivitiesSection />
          <LandingAudiencePathways />
          <LandingExpertiseSection />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

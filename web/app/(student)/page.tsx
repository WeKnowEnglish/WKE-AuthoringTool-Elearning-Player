import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingTrustSection } from "@/components/landing/LandingTrustSection";
import { LevelLandingClient } from "@/components/landing/LevelLandingClient";
import {
  resolveLandingRedirectPath,
  shouldSkipLevelLanding,
} from "@/lib/landing/should-skip-landing";
import { createClient } from "@/lib/supabase/server";

const siteUrl = "https://weknowenglish.online";

const title = "We Know English | ESL Learning Platform for Grades 1–9";

const description =
  "Interactive English lessons, vocabulary practice, grammar activities, learning games, teacher tools, and progress tracking for primary and secondary students.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteUrl}/`,
  },
  openGraph: {
    title,
    description,
    url: `${siteUrl}/`,
    siteName: "We Know English",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "We Know English",
      alternateName: "We Know English Online",
      url: `${siteUrl}/`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "We Know English",
      alternateName: "We Know English Online",
      description,
      inLanguage: "en",
      publisher: {
        "@id": `${siteUrl}/#organization`,
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
      <main>
        <LevelLandingClient>
          <LandingTrustSection />
        </LevelLandingClient>
      </main>
    </>
  );
}

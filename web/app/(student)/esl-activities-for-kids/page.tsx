import type { Metadata } from "next";
import Link from "next/link";
import { AuthorByline } from "@/components/marketing/AuthorByline";
import { FreeActivityList } from "@/components/marketing/FreeActivityList";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { PillarCtaRow } from "@/components/marketing/PillarCtaRow";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";

const pathname = "/esl-activities-for-kids";
const title = "Online ESL Activities for Kids";
const description =
  "Find interactive ESL activities for kids — grammar posters, vocabulary practice, and classroom-ready tasks you can use today. Browse by skill and level.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  pathname,
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "ESL activities for kids", path: pathname },
];

const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

export default function EslActivitiesForKidsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MarketingPageShell breadcrumbs={breadcrumbs}>
        <AuthorByline
          reviewStatus="editor-reviewed"
          datePublished="27 July 2026"
          dateModified="27 July 2026"
        />
        <h1>Interactive ESL activities for kids</h1>
        <p>
          Looking for online ESL activities that children can actually use — not empty category
          pages? Start with real practice below: grammar posters, vocabulary tasks, and short
          interactive paths you can open immediately.
        </p>

        <h2>Free activities you can use today</h2>
        <p>
          Each activity below has a clear language goal, age-appropriate interaction, and a real
          next step. We only list activities that exist now — not “coming soon” placeholders.
        </p>
        <FreeActivityList />

        <h2>Browse by grammar topic</h2>
        <p>
          The{" "}
          <Link href="/grammar">grammar library</Link> includes published posters for elementary
          learners — for example There is / There are, countable nouns, and plural forms.
          Each poster combines explanation with interactive practice.
        </p>

        <h2>For teachers planning lessons</h2>
        <p>
          Use these activities in class, assign them for homework, or point families to the same
          links for home practice. For the full create → teach → assign → practise → review
          workflow, see{" "}
          <a href="/teach-english-online">how to teach English online to children</a>.
        </p>

        <h2>For parents at home</h2>
        <p>
          If you are supporting a child between classes, see{" "}
          <a href="/english-learning-for-kids-at-home">
            structured English practice for kids at home
          </a>{" "}
          for a simple weekly routine.
        </p>

        <PillarCtaRow
          primaryHref="/grammar"
          primaryLabel="Browse grammar activities"
          secondaryHref="/login?portal=teacher"
          secondaryLabel="Start teaching"
        />
      </MarketingPageShell>
    </>
  );
}

import type { Metadata } from "next";
import { AuthorByline } from "@/components/marketing/AuthorByline";
import { FreeActivityList } from "@/components/marketing/FreeActivityList";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { PillarCtaRow } from "@/components/marketing/PillarCtaRow";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";

const pathname = "/english-learning-for-kids-at-home";
const title = "English Learning for Kids at Home";
const description =
  "Structured English practice for kids at home — short sessions, clear goals, and interactive activities parents can guide without re-teaching grammar from scratch.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  pathname,
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "English at home", path: pathname },
];

const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

export default function EnglishLearningAtHomePage() {
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
        <h1>Structured English practice for kids at home</h1>
        <p>
          Home English practice works best when it is short, predictable, and connected to what
          your child is learning at school — not random screen time with unclear goals.
        </p>

        <h2>A simple weekly routine</h2>
        <ol>
          <li>
            <strong>Pick one language goal</strong> from school or your child&apos;s teacher (for
            example hobbies vocabulary or There is / There are).
          </li>
          <li>
            <strong>Practise for 10–20 minutes</strong> with one interactive activity, then stop
            while energy is still positive.
          </li>
          <li>
            <strong>Repeat mid-week</strong> with the same target in a different format (poster,
            flashcards, or a short quiz).
          </li>
          <li>
            <strong>Review on the weekend</strong> — ask your child to explain one thing they
            learned in English.
          </li>
        </ol>

        <h2>Free activities to start with</h2>
        <p>
          These activities are ready now. If your child&apos;s teacher uses We Know English,
          they may assign the same tasks in class — use the class join link they provide.
        </p>
        <FreeActivityList />

        <h2>If your child has a class code</h2>
        <p>
          Enrolled students should <a href="/join-class">join their class</a> or{" "}
          <a href="/login">sign in</a> so homework and progress stay connected to their teacher.
          You do not need to choose Primary or Secondary first — the class link handles that.
        </p>

        <h2>For teachers supporting families</h2>
        <p>
          Share one learning goal, how long practice should take, the exact link to use, and what
          “finished” looks like. For lesson planning, see{" "}
          <a href="/teach-english-online">how to teach English online to children</a>.
        </p>

        <PillarCtaRow
          primaryHref="/esl-activities-for-kids"
          primaryLabel="Browse ESL activities"
          secondaryHref="/join-class"
          secondaryLabel="Join a class"
        />
      </MarketingPageShell>
    </>
  );
}

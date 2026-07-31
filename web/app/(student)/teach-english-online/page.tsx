import type { Metadata } from "next";
import { AuthorByline } from "@/components/marketing/AuthorByline";
import { LessonPlanDownloadGate } from "@/components/marketing/LessonPlanDownloadGate";
import { MarketingPageShell } from "@/components/marketing/MarketingPageShell";
import { PillarCtaRow } from "@/components/marketing/PillarCtaRow";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

const pathname = "/teach-english-online";
const title = "How to Teach English Online to Kids: Activities and Tools";
const description =
  "Plan, deliver, assign and review online English lessons for children using interactive activities and a connected teaching workflow.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  pathname,
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Teach English online", path: pathname },
];

const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to teach English online to children",
  description,
  author: {
    "@type": "Person",
    name: "Brady Myers",
    url: `${SITE_URL}/about`,
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  datePublished: "2026-07-27",
  dateModified: "2026-07-27",
  mainEntityOfPage: `${SITE_URL}${pathname}`,
};

export default function TeachEnglishOnlinePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MarketingPageShell breadcrumbs={breadcrumbs}>
        <AuthorByline
          reviewStatus="editor-reviewed"
          datePublished="27 July 2026"
          dateModified="27 July 2026"
        />
        <h1>How to teach English online to children</h1>
        <p>
          Teaching English online to kids works when the lesson has a clear language goal, fast
          participation, and a path for practice after class — not when the hour is a long
          lecture through a webcam.
        </p>
        <p>
          This guide walks through a practical workflow:{" "}
          <strong>create → teach live → assign → practise → review</strong>. Below you
          can also download ready-made{" "}
          <a href="#teacher-lesson-plans">ESL mini-series lesson plans</a> for online
          classes. For the wider tool landscape, see{" "}
          <a href="/resources/what-is-edtech">What is EdTech?</a>. Parents supporting home
          learning should also see{" "}
          <a href="/english-learning-for-kids-at-home">
            English learning for kids at home
          </a>
          .
        </p>

        <h2>What good online English looks like for kids</h2>
        <ul>
          <li>Short activity cycles, not long monologues</li>
          <li>Visible models and repetition with variation</li>
          <li>Low-friction ways to join and take turns</li>
          <li>Movement between listen → say → play → show understanding</li>
          <li>Homework that continues the same language target from class</li>
        </ul>

        <h2>The connected workflow</h2>
        <h3>1. Create once</h3>
        <p>
          Build an interactive activity around one clear objective (for example, asking about
          hobbies with <em>Do you…?</em> / <em>I…</em>). Include target language, quick visuals,
          and a practice task with more than one attempt.
        </p>
        <h3>2. Teach live</h3>
        <p>
          Warm up with known language, present the target with clear models, run controlled
          practice, check understanding with a quick interactive task, then preview homework so
          students know what “done” looks like.
        </p>
        <h3>3. Assign homework</h3>
        <p>
          Send the same activity or a tight sibling task. Good online homework for kids has a
          visible finish line and can be completed in 10–20 minutes without a parent re-teaching
          the grammar point.
        </p>
        <h3>4. Guide independent practice</h3>
        <p>
          Between lessons, learners need spaced repetition. Point families to{" "}
          <a href="/esl-activities-for-kids">ESL activities for kids</a> or your assigned links
          — not random browsing.
        </p>
        <h3>5. Review progress</h3>
        <p>
          Before the next live class, check who completed practice, which items caused errors,
          and whether the objective is ready to extend or needs reteaching.
        </p>

        <h2>A sample online lesson structure (45–60 minutes)</h2>
        <div className="not-prose overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-kid-ink/20">
                <th className="py-2 pr-4 font-extrabold">Phase</th>
                <th className="py-2 pr-4 font-extrabold">Time</th>
                <th className="py-2 font-extrabold">What happens</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-kid-ink/80">
              <tr className="border-b border-kid-ink/10">
                <td className="py-2 pr-4">Connect</td>
                <td className="py-2 pr-4">3–5 min</td>
                <td className="py-2">Greetings, routine question, devices ready</td>
              </tr>
              <tr className="border-b border-kid-ink/10">
                <td className="py-2 pr-4">Warm-up</td>
                <td className="py-2 pr-4">5 min</td>
                <td className="py-2">Known language game or flash review</td>
              </tr>
              <tr className="border-b border-kid-ink/10">
                <td className="py-2 pr-4">Present</td>
                <td className="py-2 pr-4">7–10 min</td>
                <td className="py-2">Target language with clear examples</td>
              </tr>
              <tr className="border-b border-kid-ink/10">
                <td className="py-2 pr-4">Practice</td>
                <td className="py-2 pr-4">10–15 min</td>
                <td className="py-2">Interactive controlled practice</td>
              </tr>
              <tr className="border-b border-kid-ink/10">
                <td className="py-2 pr-4">Check</td>
                <td className="py-2 pr-4">5 min</td>
                <td className="py-2">Quick interactive check / exit ticket</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Assign</td>
                <td className="py-2 pr-4">3 min</td>
                <td className="py-2">Show homework screen; confirm “done” means</td>
              </tr>
            </tbody>
          </table>
        </div>

        <LessonPlanDownloadGate />

        <h2>How We Know English fits this workflow</h2>
        <p>
          Build an activity once, then teach it live, assign it as homework, place it in a student
          learning path and track what students understand — without stitching together five
          different tools. Browse ready-to-use practice on{" "}
          <a href="/esl-activities-for-kids">ESL activities for kids</a>.
        </p>

        <PillarCtaRow
          primaryHref="/esl-activities-for-kids"
          primaryLabel="Explore free activities"
          secondaryHref="/login?portal=teacher"
          secondaryLabel="Start teaching"
        />
      </MarketingPageShell>
    </>
  );
}

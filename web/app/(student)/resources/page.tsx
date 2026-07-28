import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { PillarCtaRow } from "@/components/marketing/PillarCtaRow";
import {
  formatResourceDisplayDate,
  listResourceArticles,
} from "@/lib/resources/load-articles";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/seo/site";

const pathname = "/resources";
const title = "Resources for English Teachers";
const description =
  "Practical EdTech guides for English teachers — what education technology is, how it is changing classrooms, and how to teach with purpose.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  pathname,
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Resources", path: pathname },
];

export default function ResourcesHubPage() {
  const articles = listResourceArticles({ publishedOnly: true });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
        <MarketingHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
          <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
            Resources
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-kid-ink sm:text-4xl">
            Guides for teaching English with technology
          </h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
            Clear, teacher-first reading from {SITE_NAME}: definitions, classroom
            implications, and a connected workflow — not another feed of tool launches.
          </p>

          <ul className="mt-10 space-y-4">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={article.pathname}
                  className="block rounded-xl border-2 border-kid-ink/20 bg-white p-5 shadow-[4px_4px_0_0_rgba(15,23,42,0.06)] transition hover:border-kid-ink/40"
                >
                  <h2 className="text-lg font-extrabold text-kid-ink">{article.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
                    {article.description}
                  </p>
                  {article.datePublished ? (
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-kid-ink/50">
                      {formatResourceDisplayDate(article.datePublished)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-xl border-2 border-kid-ink/15 bg-[#fff8eb] p-5">
            <h2 className="text-lg font-extrabold text-kid-ink">Also useful</h2>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-kid-ink/80">
              <li>
                <Link
                  href="/teach-english-online"
                  className="font-extrabold text-kid-ink underline underline-offset-2"
                >
                  How to teach English online
                </Link>{" "}
                — the product workflow pillar (create → teach → assign → practise → review).
              </li>
              <li>
                <Link
                  href="/esl-activities-for-kids"
                  className="font-extrabold text-kid-ink underline underline-offset-2"
                >
                  ESL activities for kids
                </Link>{" "}
                — browse interactive practice ideas.
              </li>
              <li>
                <Link
                  href="/about"
                  className="font-extrabold text-kid-ink underline underline-offset-2"
                >
                  About
                </Link>{" "}
                — who builds We Know English and how we review content claims.
              </li>
            </ul>
          </div>

          <PillarCtaRow
            primaryHref="/esl-activities-for-kids"
            primaryLabel="Explore free activities"
            secondaryHref="/teach-english-online"
            secondaryLabel="Teach online guide"
          />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

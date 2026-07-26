import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClassroomActivityTile } from "@/components/teacher-space/ClassroomActivityTile";
import { loadPublicTeacherSpace } from "@/lib/data/teacher-space";
import { classroomThemeStyle } from "@/lib/teacher-space/themes";

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const page = await loadPublicTeacherSpace(handle);
  if (!page) {
    return { title: "Classroom", robots: { index: false, follow: false } };
  }
  return {
    title: `${page.space.title} · We Know English`,
    description: page.space.bio || `Practice English in ${page.space.title}`,
  };
}

export default async function PublicTeacherSpacePage({ params }: Props) {
  const { handle } = await params;
  const page = await loadPublicTeacherSpace(handle);
  if (!page) notFound();

  const themeStyle = classroomThemeStyle(page.space.theme_id);
  const bio =
    page.space.bio.trim() ||
    `Practice English with ${page.space.title}.`;

  return (
    <main
      className="min-h-dvh"
      style={{
        ...themeStyle,
        background: "var(--classroom-surface-2)",
        color: "var(--classroom-ink)",
      }}
    >
      <section className="relative min-h-[min(88dvh,720px)] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: page.space.hero_image_url
              ? undefined
              : "var(--classroom-hero-wash)",
          }}
        >
          {page.space.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.space.hero_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.45) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0 2px, transparent 3px)",
                backgroundSize: "28px 28px, 36px 36px",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "var(--classroom-hero-overlay)" }}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[min(88dvh,720px)] max-w-5xl flex-col justify-end px-5 pb-12 pt-20 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
            @{page.space.handle}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white drop-shadow sm:text-5xl md:text-6xl">
            {page.space.title}
          </h1>
          <p className="mt-4 max-w-xl text-base font-semibold text-white/90 sm:text-lg">
            {bio}
          </p>
          <a
            href="#activities"
            className="mt-8 inline-flex w-fit items-center rounded-xl px-5 py-3 text-base font-extrabold shadow-lg transition hover:brightness-105"
            style={{
              background: "var(--classroom-cta)",
              color: "var(--classroom-cta-ink)",
            }}
          >
            Browse activities
          </a>
        </div>
      </section>

      <section
        id="activities"
        className="mx-auto max-w-5xl scroll-mt-6 px-5 py-12 sm:px-8"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--classroom-ink)]">
              Activities
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--classroom-muted)]">
              Open any activity to practice. Progress is not tracked.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-[var(--classroom-muted)] hover:underline"
          >
            We Know English
          </Link>
        </div>

        {page.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/15 bg-[var(--classroom-panel)] px-4 py-12 text-center text-sm font-medium text-[var(--classroom-muted)]">
            No activities published yet. Check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((item) => (
              <li key={item.id}>
                <ClassroomActivityTile item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

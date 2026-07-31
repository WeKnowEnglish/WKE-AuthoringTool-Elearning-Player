import Link from "next/link";

export function LandingExpertiseSection() {
  return (
    <section
      aria-labelledby="expertise-heading"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-8"
    >
      <div className="rounded-2xl border-2 border-kid-ink/15 bg-[#eff6ff] p-6 sm:p-8">
        <h2 id="expertise-heading" className="text-2xl font-extrabold text-kid-ink">
          Designed by a classroom teacher
        </h2>
        <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-kid-ink/80">
          We Know English is built by Brady Myers, M.Ed. — an ESL teacher and curriculum
          designer focused on interactive lessons that work in real classes, homework, and
          independent practice.
        </p>
        <Link
          href="/about"
          className="mt-5 inline-flex font-extrabold text-kid-ink underline underline-offset-4"
        >
          Read about our approach
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";

type StudentSessionUnavailablePageProps = {
  retryPath: string;
};

export function StudentSessionUnavailablePage({
  retryPath,
}: StudentSessionUnavailablePageProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-12">
      <section
        aria-labelledby="student-session-unavailable-title"
        className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm"
        role="alert"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
          Homework paused
        </p>
        <h1
          className="mt-2 text-2xl font-bold"
          id="student-session-unavailable-title"
        >
          We could not check your account just now
        </h1>
        <p className="mt-3 leading-7">
          This looks temporary. Try the homework again in a moment. Work that
          was already saved to your account is still safe.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-amber-900 px-5 py-2.5 font-semibold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
          href={retryPath}
        >
          Try again
        </Link>
      </section>
    </main>
  );
}

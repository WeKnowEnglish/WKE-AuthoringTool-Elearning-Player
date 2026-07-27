"use client";

import { useEffect, useState } from "react";
import { trackMarketingEvent } from "@/lib/seo/marketing-events";
import {
  MINI_SERIES_LIBRARY,
  MINI_SERIES_PACKS,
} from "@/lib/lesson-plans/mini-series-manifest";

const TOKEN_STORAGE_KEY = "wke:mini-series-download-token:v1";

type RequestState = "idle" | "loading" | "ready" | "error";

function buildDownloadUrl(resource: string, token: string): string {
  const params = new URLSearchParams({ token, resource });
  return `/api/resources/mini-series/download?${params.toString()}`;
}

export function LessonPlanDownloadGate() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (saved) setToken(saved);
    } catch {
      // ignore
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/resources/mini-series/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sourcePage: MINI_SERIES_LIBRARY.sourcePage,
        }),
      });

      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        setState("error");
        setError(data.error ?? "Could not unlock downloads. Try again.");
        return;
      }

      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setState("ready");
      trackMarketingEvent("resource_download_unlock", {
        cta: "mini_series_library",
        landingPage: MINI_SERIES_LIBRARY.sourcePage,
        userRole: "teacher",
      });
    } catch {
      setState("error");
      setError("Network error. Check your connection and try again.");
    }
  }

  const unlocked = Boolean(token);

  return (
    <section
      id="teacher-lesson-plans"
      aria-labelledby="teacher-lesson-plans-heading"
      className="not-prose mt-10 rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-6 shadow-[6px_6px_0_0_var(--kid-shadow)] sm:p-8"
    >
      <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
        Free teacher resource
      </p>
      <h2 id="teacher-lesson-plans-heading" className="mt-2 text-2xl font-extrabold text-kid-ink sm:text-3xl">
        ESL Mini-Series lesson plans
      </h2>
      <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-kid-ink/80">
        {MINI_SERIES_LIBRARY.description} Enter your work email to download Word
        lesson plans you can teach online this week.
      </p>

      {!unlocked ? (
        <form onSubmit={handleSubmit} className="mt-6 max-w-xl">
          <label htmlFor="mini-series-email" className="block text-sm font-extrabold text-kid-ink">
            Work email
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="mini-series-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@school.edu"
              className="min-w-0 flex-1 rounded-xl border-2 border-kid-ink/25 bg-white px-4 py-3 text-sm font-semibold text-kid-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)] disabled:opacity-60"
            >
              {state === "loading" ? "Unlocking…" : "Email to download"}
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-bold text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <p className="mt-3 text-xs font-semibold leading-relaxed text-kid-ink/60">
            We use your email only to send teaching resources and occasional product
            updates. See our{" "}
            <a href="/privacy" className="font-extrabold text-kid-ink underline underline-offset-2">
              privacy policy
            </a>
            .
          </p>
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            <a
              href={buildDownloadUrl("library", token!)}
              className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)]"
              onClick={() =>
                trackMarketingEvent("resource_download_start", {
                  cta: "full_library_zip",
                  landingPage: MINI_SERIES_LIBRARY.sourcePage,
                })
              }
            >
              Download full library (12 lessons)
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {MINI_SERIES_PACKS.map((pack) => (
              <article
                key={pack.slug}
                className="rounded-xl border-2 border-kid-ink/15 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold text-kid-ink">{pack.title}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-kid-ink/55">
                      {pack.cefr} · {pack.gradeBand}
                    </p>
                  </div>
                  <a
                    href={buildDownloadUrl(`pack:${pack.slug}`, token!)}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-kid-ink/25 bg-[#eff6ff] px-3 py-2 text-xs font-extrabold text-kid-ink"
                    onClick={() =>
                      trackMarketingEvent("resource_download_start", {
                        cta: `pack_${pack.slug}`,
                        cefr: pack.cefr,
                        landingPage: MINI_SERIES_LIBRARY.sourcePage,
                      })
                    }
                  >
                    Pack ZIP
                  </a>
                </div>
                <ul className="mt-3 space-y-2">
                  {pack.lessons.map((lesson) => (
                    <li key={lesson.slug} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-kid-ink/80">{lesson.title}</span>
                      <a
                        href={buildDownloadUrl(`lesson:${lesson.slug}`, token!)}
                        className="text-xs font-extrabold text-kid-ink underline underline-offset-2"
                        onClick={() =>
                          trackMarketingEvent("resource_download_start", {
                            cta: `lesson_${lesson.slug}`,
                            cefr: pack.cefr,
                            landingPage: MINI_SERIES_LIBRARY.sourcePage,
                          })
                        }
                      >
                        .docx
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="text-xs font-semibold text-kid-ink/60">
            Downloads stay unlocked in this browser for seven days. Use the same email if
            you return on another device.
          </p>
        </div>
      )}
    </section>
  );
}

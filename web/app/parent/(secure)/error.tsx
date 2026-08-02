"use client";

import { AlertTriangle } from "lucide-react";

export default function ParentPortalError(props: { reset: () => void }) {
  return (
    <section className="rounded-3xl border border-red-200 bg-white px-5 py-10 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-9 w-9 text-red-600" aria-hidden />
      <h1 className="mt-4 text-xl font-black">We could not load this update</h1>
      <p className="mt-2 text-slate-600">
        Your access has not changed. Please try loading this page again.
      </p>
      <button
        type="button"
        onClick={props.reset}
        className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700"
      >
        Try again
      </button>
    </section>
  );
}

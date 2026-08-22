import type { TrialStudentDiscovery } from "@/lib/class-schedule/trial-types";

export function TeacherTrialDiscoveryCard({
  discovery,
}: {
  discovery: TrialStudentDiscovery | null;
}) {
  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-violet-700">
        Student discovery
      </p>
      {!discovery ? (
        <p className="mt-2 text-sm font-semibold text-slate-600">
          The student has not completed their short trial introduction yet. Ask them to open the
          trial class before you begin.
        </p>
      ) : (
        <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p><span className="font-black">Preferred name:</span> {discovery.preferredName}</p>
          <p>
            <span className="font-black">Speaking confidence:</span>{" "}
            {discovery.confidence == null ? "Not answered" : `${discovery.confidence}/5`}
          </p>
          <p><span className="font-black">Interests:</span> {discovery.interests || "Not answered"}</p>
          <p><span className="font-black">Uses English for:</span> {discovery.englishUse || "Not answered"}</p>
          <p className="sm:col-span-2"><span className="font-black">Goal:</span> {discovery.englishGoals || "Not answered"}</p>
          <p><span className="font-black">Feels easy:</span> {discovery.feelsEasy || "Not answered"}</p>
          <p><span className="font-black">Feels difficult:</span> {discovery.feelsDifficult || "Not answered"}</p>
        </div>
      )}
    </section>
  );
}

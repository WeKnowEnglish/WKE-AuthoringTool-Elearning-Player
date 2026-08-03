import { ParentSettingsForm } from "@/components/parent/ParentSettingsForm";
import { getParentAccountSettings } from "@/lib/parent/parent-notifications";

export default async function ParentSettingsPage() {
  const settings = await getParentAccountSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Parent settings</h1>
        <p className="mt-2 leading-relaxed text-slate-600">
          Choose how the portal keeps you informed. Student learning details are never placed in
          notification emails.
        </p>
      </header>
      <ParentSettingsForm initial={settings} />
    </div>
  );
}

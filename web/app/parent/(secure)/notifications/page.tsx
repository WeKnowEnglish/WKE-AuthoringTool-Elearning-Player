import { ParentNotificationsList } from "@/components/parent/ParentNotificationsList";
import { listParentNotifications } from "@/lib/parent/parent-notifications";

export default async function ParentNotificationsPage() {
  const notifications = await listParentNotifications();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          Updates
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Notifications</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">
          Important report and family-access notices. Detailed learning information stays inside
          the secure portal.
        </p>
      </header>
      <ParentNotificationsList notifications={notifications} />
    </div>
  );
}

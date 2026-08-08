import { ParentNotificationsPageView } from "@/components/parent/ParentNotificationsPageView";
import { listParentNotifications } from "@/lib/parent/parent-notifications";

export default async function ParentNotificationsPage() {
  const notifications = await listParentNotifications();
  return <ParentNotificationsPageView notifications={notifications} />;
}

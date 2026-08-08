import { ParentSettingsPageView } from "@/components/parent/ParentSettingsPageView";
import { getParentAccountSettings } from "@/lib/parent/parent-notifications";

export default async function ParentSettingsPage() {
  const settings = await getParentAccountSettings();
  return <ParentSettingsPageView initial={settings} />;
}

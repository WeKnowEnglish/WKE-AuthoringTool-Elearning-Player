import { ActivityTrackPreviewBridge } from "@/components/teacher/activity-builder/ActivityTrackPreviewBridge";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ActivityTrackPreviewPage({ params }: Props) {
  const { id } = await params;
  return <ActivityTrackPreviewBridge trackId={id} />;
}

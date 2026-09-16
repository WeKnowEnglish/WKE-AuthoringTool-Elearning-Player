import { notFound } from "next/navigation";
import { CampusPlaySpace } from "@/components/world/play/CampusPlaySpace";
import { isPlaySpot } from "@/lib/world/play-spots";

export const metadata = {
  title: "Walk around — WKE World Pilot",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ spot: string }>;
};

export default async function WorldPlayPilotPage({ params }: Props) {
  const { spot } = await params;
  if (!isPlaySpot(spot)) notFound();
  return <CampusPlaySpace spot={spot} backHref="/pilots/world" />;
}

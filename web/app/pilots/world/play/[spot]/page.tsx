import { notFound, redirect } from "next/navigation";
import { CampusPlaySpace } from "@/components/world/play/CampusPlaySpace";
import { isPlaySpot, playMapHref } from "@/lib/world/play-spots";

export const metadata = {
  title: "Inside — WKE World Pilot",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ spot: string }>;
  searchParams: Promise<{ inside?: string }>;
};

export default async function WorldPlayPilotPage({ params, searchParams }: Props) {
  const { spot } = await params;
  const { inside } = await searchParams;
  if (!isPlaySpot(spot)) notFound();
  if (spot === "pet" || inside !== "1") {
    redirect(playMapHref(spot, "pilot"));
  }
  return (
    <CampusPlaySpace
      spot={spot}
      backHref={playMapHref(spot, "pilot")}
      designHref={spot === "cottage" ? "/pilots/world/design/cottage" : undefined}
    />
  );
}

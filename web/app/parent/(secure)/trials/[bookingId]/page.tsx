import { notFound } from "next/navigation";
import { ParentTrialBookingDetails } from "@/components/parent/ParentTrialBookingDetails";
import { getParentTrialBookingDetails } from "@/lib/data/trial-availability";

export default async function ParentTrialBookingDetailsPage(props: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await props.params;
  const details = await getParentTrialBookingDetails(bookingId);
  if (!details) notFound();

  return <ParentTrialBookingDetails {...details} />;
}

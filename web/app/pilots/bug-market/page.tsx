import { notFound } from "next/navigation";
import { BugMarketDeveloperPilot } from "@/components/pilots/BugMarketDeveloperPilot";

export default function BugMarketPilotPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BugMarketDeveloperPilot />;
}
